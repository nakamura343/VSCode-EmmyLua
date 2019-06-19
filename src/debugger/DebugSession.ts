import { LoggingDebugSession, Event, OutputEvent } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";

export abstract class DebugSession extends LoggingDebugSession {
    constructor() {
        super("emmy.debug.txt");
    }

    private _findFileSeq = 0;
    private _fileCache = new Map<string, string>();

	log(obj: any) {
		this.sendEvent(new Event("log", obj));
    }
    
    printConsole(msg: string, newLine: boolean = true) {
        if (newLine) {
            msg += "\n";
        }
        this.sendEvent(new OutputEvent(msg));
    }

    protected customRequest(command: string, response: DebugProtocol.Response, args: any): void {
        if (command === 'findFileRsp') {
            this.emit('findFileRsp', args);
        }
    }

    async findFile(file: string, ext: string[]): Promise<string> {
        const r = this._fileCache.get(file);
        if (r) {
            return r;
        }

        const seq = this._findFileSeq++;
        this.sendEvent(new Event('findFileReq', { file: file, ext: ext, seq: seq }));
        return new Promise<string>((resolve, c) => {
            const listener = (body: any) => {
                if (seq === body.seq) {
                    this.removeListener('findFileRsp', listener);
                    const files: string[] = body.files;
                    if (files.length > 0) {
                        this._fileCache.set(file, files[0]);
                        resolve(files[0]);
                    } else {
                        resolve(file);
                    }
                }
            };
            this.addListener('findFileRsp', listener);
        });
    }
}