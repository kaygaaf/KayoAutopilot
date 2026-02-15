import * as http from 'http';
import * as WebSocket from 'ws';

/**
 * Represents an active Chrome DevTools Protocol session.
 */
export interface CDPSession {
    id: string;
    ws: WebSocket;
    url: string;
    title: string;
}

/**
 * Manages WebSocket connections to VS Code's embedded Chrome instance via the Remote Debugging Protocol.
 */
export class CDPClient {
    private sessions: Map<string, CDPSession> = new Map();
    private messageIdCounter = 1;

    constructor(private logger: (msg: string) => void) { }

    private log(msg: string) {
        this.logger(`[CDP] ${msg}`);
    }

    /**
     * Scans the debug port for available pages and connects to them.
     * @param port The remote debugging port (default: 9222)
     */
    async scanAndConnect(port: number): Promise<number> {
        let connectedCount = 0;
        try {
            const pages = await this.fetchPages(port);
            if (pages.length > 0) {
                for (const page of pages) {
                    const id = `${port}:${page.id}`;
                    if (!this.sessions.has(id)) {
                        await this.connectSession(id, page.webSocketDebuggerUrl, page.url, page.title);
                        // We count it even if we don't *re*connect, just to report active count correctly?
                        // Actually logic below increments on *new* connection.
                        // But we want total active count.
                    }
                }
            }
        } catch (e) {
            // Connection errors are expected if the port is not open
        }
        return this.sessions.size;
    }

    get sessionCount(): number {
        return this.sessions.size;
    }

    private fetchPages(port: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const req = http.get({ hostname: '127.0.0.1', port, path: '/json/list', timeout: 300 }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const pages = JSON.parse(body);
                        const filtered = this.filterTargetPages(pages);
                        resolve(filtered);
                    } catch (e) { resolve([]); }
                });
            });
            req.on('error', (e) => reject(e));
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        });
    }

    /**
     * Filters the list of available targets to specific VS Code workbench pages.
     */
    private filterTargetPages(pages: any[]): any[] {
        return pages.filter(p => {
            if (!p.webSocketDebuggerUrl) return false;

            // v7.9.0 Debugging: Log ALL targets seen
            this.log(`DEBUG TARGET: Type=${p.type} Title="${p.title}" URL=${p.url.substring(0, 50)}...`);

            // 1. Must be page, webview, iframe, or other (sometimes webviews are 'other')
            if (p.type !== 'page' && p.type !== 'webview' && p.type !== 'iframe' && p.type !== 'other') return false;

            // 2. Exclude strictly external/devtools
            const isExternal = p.url.startsWith('http:') || p.url.startsWith('https:') || p.url.startsWith('devtools://');
            if (isExternal) return false;

            // 3. Relaxed VS Code Check (v7.7.0 + v7.9.0)
            // If it's a webview/iframe/other, we assume it's relevant (Chat view, etc.)
            if (p.type === 'webview' || p.type === 'iframe' || p.type === 'other') return true;

            // For 'page', strict check for workbench
            const isWorkbench = p.url.startsWith('vscode-file://') ||
                p.title.includes('Workbench') ||
                p.title.includes('Visual Studio Code');

            return isWorkbench;
        });
    }

    private connectSession(id: string, wsUrl: string, url: string, title: string): Promise<boolean> {
        return new Promise((resolve) => {
            const ws = new WebSocket(wsUrl);

            ws.on('open', () => {
                this.sessions.set(id, { id, ws, url, title });
                this.log(`Connected to session: "${title.substring(0, 40)}..."`);
                resolve(true);
            });

            ws.on('error', (err: Error) => {
                resolve(false);
            });

            ws.on('close', () => {
                this.sessions.delete(id);
                this.log(`Disconnected session: ${id}`);
            });
        });
    }

    /**
     * Executes a JavaScript expression in all active sessions.
     */
    async evaluateAll(expression: string): Promise<any[]> {
        const promises = [];
        for (const [id] of this.sessions) {
            promises.push(this.evaluate(id, expression).catch(() => null));
        }
        return Promise.all(promises);
    }

    evaluate(id: string, expression: string): Promise<any> {
        const session = this.sessions.get(id);
        if (!session || session.ws.readyState !== WebSocket.OPEN) {
            return Promise.reject(new Error('Session not active'));
        }

        return new Promise((resolve, reject) => {
            const reqId = this.messageIdCounter++;
            const timeout = setTimeout(() => {
                session.ws.off('message', onMessage);
                reject(new Error('Timeout'));
            }, 2000);

            const onMessage = (data: WebSocket.Data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.id === reqId) {
                        session.ws.off('message', onMessage);
                        clearTimeout(timeout);
                        if (msg.error) {
                            reject(new Error(msg.error.message));
                        } else {
                            resolve(msg.result);
                        }
                    }
                } catch (e) { }
            };

            session.ws.on('message', onMessage);
            session.ws.send(JSON.stringify({
                id: reqId,
                method: 'Runtime.evaluate',
                params: {
                    expression,
                    awaitPromise: true,
                    includeCommandLineAPI: true,
                    returnByValue: true
                }
            }));
        });
    }

    disconnectAll() {
        for (const session of this.sessions.values()) {
            session.ws.close();
        }
        this.sessions.clear();
    }
}
