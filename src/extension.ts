import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CDPClient } from './cdp-client';

/**
 * Kayorama Autopilot v8.0.0
 * Features:
 * - Robust Click Strategy (Text First, Style Second)
 * - Safe Iframe Piercing
 * - Auto-Logging active
 */

const outputChannel = vscode.window.createOutputChannel('Kayorama Autopilot');

// --- LOGGING SYSTEM ---
let logFilePath: string | null = null;

function initLogPath() {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        logFilePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'kayorama-debug.log');
    }
}

function log(msg: string) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const line = `[${timestamp}] ${msg}`;
    outputChannel.appendLine(line);

    if (logFilePath) {
        try {
            fs.appendFileSync(logFilePath, line + '\n');
        } catch (e) { }
    }
}

const cdp = new CDPClient(log);

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let connectionInterval: ReturnType<typeof setInterval> | null = null;
let statusBarItem: vscode.StatusBarItem;
let isEnabled = false;

// Configuration
const CONFIG_SECTION = 'kayorama';
const DEFAULT_PORT = 9000;
const POLL_MS = 500;
const RECONNECT_MS = 5000;

export function activate(context: vscode.ExtensionContext) {
    initLogPath();
    outputChannel.appendLine('Kayorama Autopilot: Initializing (v8.1.0 - Native + CDP)...');
    if (logFilePath) log(`Logging to: ${logFilePath}`);

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'kayorama.toggle';
    statusBarItem.tooltip = 'Click to toggle Autopilot';
    context.subscriptions.push(statusBarItem);
    updateStatusBar();
    statusBarItem.show();

    context.subscriptions.push(
        vscode.commands.registerCommand('kayorama.toggle', toggleAutopilot),
        vscode.commands.registerCommand('kayorama.inspectDOM', inspectDOM),
        vscode.commands.registerCommand('kayorama.dumpDiagnostics', dumpDiagnostics),
        vscode.commands.registerCommand('kayorama.dumpCommands', async () => {
            const cmds = await vscode.commands.getCommands(true);
            const fs = require('fs');
            const path = require('path');
            if (vscode.workspace.workspaceFolders) {
                const dest = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'commands_dump.json');
                fs.writeFileSync(dest, JSON.stringify(cmds.sort(), null, 2));
                vscode.window.showInformationMessage(`Commands dumped to ${dest}`);
            }
        })
    );

    log('Kayorama Autopilot: Ready.');
}

export function deactivate() {
    stopPolling();
}

function toggleAutopilot() {
    isEnabled = !isEnabled;
    updateStatusBar();
    if (isEnabled) startPolling();
    else stopPolling();
}

function startPolling() {
    stopPolling();
    const getPort = () => vscode.workspace.getConfiguration(CONFIG_SECTION).get<number>('cdpPort', DEFAULT_PORT);

    cdp.scanAndConnect(getPort());

    connectionInterval = setInterval(() => {
        if (!isEnabled) return;
        cdp.scanAndConnect(getPort());
    }, RECONNECT_MS);

    pollingInterval = setInterval(async () => {
        if (!isEnabled) return;
        updateStatusBar();

        if (cdp.sessionCount > 0) {
            await executeCDPClickStrategy();
        } else {
            await executeCommandFallbackStrategy();
        }
    }, POLL_MS);
}

function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    if (connectionInterval) clearInterval(connectionInterval);
    pollingInterval = null;
    connectionInterval = null;
    cdp.disconnectAll();
}

/**
 * Strategy A: Deep DOM Scan via CDP (v8.0.0 Robust)
 * Logic: Checks TEXT first, then STYLE (safely).
 * This prevents crashes on cross-origin iframe elements.
 */
async function executeCDPClickStrategy() {
    const script = `
        (function() {
            function triggerClick(el) {
                // v8.0.0: Use owner document and window for correct context
                const doc = el.ownerDocument || document;
                const win = doc.defaultView || window;
                
                const opts = { bubbles: true, cancelable: true, view: win };
                el.dispatchEvent(new MouseEvent('mousedown', opts));
                el.dispatchEvent(new MouseEvent('mouseup', opts));
                el.click();
            }

            function scan(root, depth = 0) {
                if (depth > 20) return null;
                
                let bestCandidate = null;
                let bestScore = 0; 
                
                let children = [];
                try {
                    if (root.querySelectorAll) {
                         children = Array.from(root.querySelectorAll('*')); 
                    }
                    if (root.tagName === 'IFRAME') {
                        try {
                            if (root.contentDocument) {
                                const iframeResult = scan(root.contentDocument, depth + 1);
                                if (iframeResult && iframeResult.score > bestScore) {
                                    bestCandidate = iframeResult.candidate;
                                    bestScore = iframeResult.score;
                                }
                            }
                        } catch(e) {}
                    }
                } catch(e) { return null; }

                for (const el of children) {
                    if (el.shadowRoot) {
                        const shadowResult = scan(el.shadowRoot, depth + 1);
                        if (shadowResult && shadowResult.score > bestScore) {
                            bestCandidate = shadowResult.candidate;
                            bestScore = shadowResult.score;
                        }
                    }
                    if (el.tagName === 'IFRAME') {
                         const iframeResult = scan(el, depth + 1); 
                         if (iframeResult && iframeResult.score > bestScore) {
                             bestCandidate = iframeResult.candidate;
                             bestScore = iframeResult.score;
                         }
                    }

                    // --- v8.0.0: ELEMENT EVALUATION (Text Match FIRST) ---
                    if (el.offsetParent === null) continue;

                    const text = (el.textContent || '').trim().toLowerCase();
                    const label = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                    const title = (el.getAttribute('title') || '').trim().toLowerCase();
                    
                    const blacklist = ['open', 'agent', 'manager', 'chat', 'discard', 'cancel', 'debug', 'run', 'go', 'history', 'log', 'browser', 'split', 'editor', 'toggle'];
                    
                    const isBlacklisted = (s) => blacklist.some(b => s.includes(b));
                    if (isBlacklisted(text) || isBlacklisted(label) || isBlacklisted(title)) continue;

                    let score = 0;
                    
                    const matchesKeyword = (s) => s === 'accept' || s === 'accept all' || s === 'apply';
                    
                    if (matchesKeyword(label)) score = 95;
                    else if (matchesKeyword(title)) score = 95;
                    else if (text === 'accept all') score = 100;
                    else if (text.startsWith('accept all')) score = 90;
                    else if (text === 'accept') score = 80;
                    else if (text === 'apply') score = 75;
                    else if (text.includes('accept all')) score = 65; 

                    // Optimization: If score is low, skip expensive style checks
                    if (score < 60) continue;

                    // --- STYLE CHECK (Safe) ---
                    try {
                        const win = el.ownerDocument.defaultView || window;
                        const style = win.getComputedStyle(el);
                        
                        if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') continue;

                        let isInteractive = style.cursor === 'pointer';
                        
                        // Check parent for cursor:pointer if element itself isn't
                        if (!isInteractive && el.parentElement) {
                             const pStyle = win.getComputedStyle(el.parentElement);
                             if (pStyle.cursor === 'pointer') isInteractive = true;
                        }
                        if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') isInteractive = true;
                        
                        // v8.0.0: Explicitly allow "Accept all" text even if cursor is weird, as long as it's not hidden
                        if (!isInteractive && score >= 90) {
                             isInteractive = true; 
                        }

                        if (!isInteractive) continue;

                    } catch(e) { 
                        // If cross-origin style check fails, but score is high, take a leap of faith?
                        // No, unsafe. Assume not interactive.
                        continue; 
                    }

                    const cls = (el.className || '').toLowerCase();
                    if (cls.includes('statusbar') || cls.includes('tab') || cls.includes('monaco-breadcrumb')) continue;
                    if (text.includes('accepting') || label.includes('accepting')) continue;

                    if (score > bestScore) {
                        bestScore = score;
                        bestCandidate = el;
                    }
                }

                return bestCandidate ? { candidate: bestCandidate, score: bestScore } : null;
            }

            const result = scan(document);
            if (result && result.candidate) {
                const details = {
                    tagName: result.candidate.tagName,
                    text: (result.candidate.textContent || '').substring(0, 30),
                    label: result.candidate.getAttribute('aria-label'),
                    title: result.candidate.getAttribute('title'),
                    score: result.score
                };
                
                triggerClick(result.candidate);
                
                try {
                   result.candidate.style.outline = '4px solid #00FF00'; // Green flash
                   setTimeout(() => result.candidate.style.outline = '', 500);
                } catch(e){}

                return details;
            }
            return null;
        })()
    `;

    try {
        const results = await cdp.evaluateAll(script);
        if (results && Array.isArray(results)) {
            results.forEach(r => {
                if (r?.result?.value) {
                    const info = r.result.value;
                    log(`[CLICKED] Score:${info.score} <${info.tagName}> Text:"${info.text}" Label:"${info.label}" Title:"${info.title}"`);
                }
            });
        }
    } catch (e) { }
}

async function executeCommandFallbackStrategy() {
    const fallbackCommands = [
        'antigravity.command.accept', // High probability for User's Agent
        'antigravity.agent.acceptAgentStep',
        'antigravity.prioritized.agentAcceptAllInFile',
        'inlineChat.acceptChanges', // Standard Chat
        'editor.action.inlineSuggest.commit', // Standard Copilot
        'interactive.acceptChanges',
        'workbench.action.terminal.chat.runCommand',
        'workbench.action.acceptRefactoring'
    ];

    // We cycle through them. 
    // Note: We don't log every attempt to avoid spamming the output, 
    // unless we want to debug.

    // log('Native Fallback: Attempting native accept commands...');
    for (const cmd of fallbackCommands) {
        try {
            await vscode.commands.executeCommand(cmd);
        } catch (e) {
            // Ignore errors (command might not be enabled in current context)
        }
    }
}

function updateStatusBar() {
    if (isEnabled) {
        statusBarItem.text = `$(check) Auto: ON (CDP: ${cdp.sessionCount})`;
        statusBarItem.backgroundColor = cdp.sessionCount > 0 ? undefined : new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.text = '$(circle-slash) Auto: OFF';
        statusBarItem.backgroundColor = undefined;
    }
}

async function inspectDOM() {
    vscode.window.showInformationMessage('Scanning DOM & IFRAMES...');
    outputChannel.show();

    const port = vscode.workspace.getConfiguration(CONFIG_SECTION).get<number>('cdpPort', DEFAULT_PORT);
    await cdp.scanAndConnect(port);

    const script = `
        (function() {
            const results = [];
            function scan(root, depth = 0) {
                if (depth > 20) return;
                let children = [];
                try { children = Array.from(root.querySelectorAll('*')); } catch(e){ return; }

                if (root.tagName === 'IFRAME') {
                    try {
                        if (root.contentDocument) {
                            results.push({ tag: 'IFRAME-ENTER', src: root.src });
                            scan(root.contentDocument, depth + 1);
                            return;
                        } else {
                            results.push({ tag: 'IFRAME-BLOCKED', src: root.src });
                        }
                    } catch(e) {
                         results.push({ tag: 'IFRAME-ERROR', src: root.src, error: e.toString() });
                    }
                }

                for (const el of children) {
                    if (el.shadowRoot) scan(el.shadowRoot, depth + 1);
                    if (el.tagName === 'IFRAME') scan(el, depth + 1); 

                    if (el.offsetParent === null) continue;

                    const text = (el.textContent || '').trim().toLowerCase().replace(/\\s+/g, ' ');
                    const label = (el.getAttribute('aria-label') || '').toLowerCase();
                    const title = (el.getAttribute('title') || '').toLowerCase();
                    
                    const isMatch = text.includes('accept') || label.includes('accept') || title.includes('accept') ||
                                    text.includes('apply') || text.includes('review');

                    if (isMatch) {
                         let cursor = 'unknown';
                         try {
                             const win = el.ownerDocument.defaultView || window;
                             cursor = win.getComputedStyle(el).cursor;
                         } catch(e) {}

                         results.push({
                            tag: el.tagName,
                            text: text.substring(0, 100),
                            label: label,
                            title: title,
                            class: el.className || '',
                            cursor: cursor,
                            inIframe: root !== document
                         });
                    }
                }
            }
            scan(document);
            return {
                title: document.title,
                url: document.location.href,
                results: results
            };
        })()
    `;

    const results = await cdp.evaluateAll(script);
    log('[Inspector DUMP v8.0.0] ' + JSON.stringify(results, null, 2));
}

async function dumpDiagnostics() {
    vscode.window.showInformationMessage('Dumping raw diagnostics to log...');
    const port = vscode.workspace.getConfiguration(CONFIG_SECTION).get<number>('cdpPort', DEFAULT_PORT);
    const http = require('http');
    http.get({ hostname: '127.0.0.1', port, path: '/json/list' }, (res: any) => {
        let body = '';
        res.on('data', (chunk: any) => body += chunk);
        res.on('end', () => {
            log('[RAW TARGETS] ' + body);
        });
    }).on('error', (e: any) => log('[RAW TARGETS ERROR] ' + e.message));
}
