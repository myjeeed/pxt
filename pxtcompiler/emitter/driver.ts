/// <reference path="../../built/typescriptServices.d.ts"/>
/// <reference path="../../localtypings/pxtarget.d.ts"/>

// Enforce order:
/// <reference path="avr.ts"/>
/// <reference path="thumb.ts"/>
/// <reference path="ir.ts"/>
/// <reference path="emitter.ts"/>
/// <reference path="backthumb.ts"/>
/// <reference path="decompiler.ts"/>

namespace ts.pxtc {
    export interface CompileResult {
        // Extend the CompileResult interface with ts specific fields
        ast?: Program;
    }

    export function getTsCompilerOptions(opts: CompileOptions) {
        let options = ts.getDefaultCompilerOptions()

        options.target = ScriptTarget.ES5;
        options.module = ModuleKind.None;
        options.noImplicitAny = true;
        options.noImplicitReturns = true;
        options.allowUnreachableCode = true;
        return options
    }

    export function nodeLocationInfo(node: ts.Node) {
        let file = getSourceFileOfNode(node)
        const nodeStart = node.getStart ? node.getStart() : node.pos;
        const { line, character } = ts.getLineAndCharacterOfPosition(file, nodeStart);
        const { line: endLine, character: endChar } = ts.getLineAndCharacterOfPosition(file, node.end);
        let r: LocationInfo = {
            start: nodeStart,
            length: node.end - nodeStart,
            line: line,
            column: character,
            endLine: endLine,
            endColumn: endChar,
            fileName: file.fileName,
        }
        return r
    }

    export function patchUpDiagnostics(diags: Diagnostic[]) {
        let highPri = diags.filter(d => d.code == 1148)
        if (highPri.length > 0)
            diags = highPri;
        return diags.map(d => {
            if (!d.file) {
                let rr: KsDiagnostic = {
                    code: d.code,
                    start: d.start,
                    length: d.length,
                    line: 0,
                    column: 0,
                    messageText: d.messageText,
                    category: d.category,
                    fileName: "?",
                }
                return rr
            }

            const pos = ts.getLineAndCharacterOfPosition(d.file, d.start);
            let r: KsDiagnostic = {
                code: d.code,
                start: d.start,
                length: d.length,
                line: pos.line,
                column: pos.character,
                messageText: d.messageText,
                category: d.category,
                fileName: d.file.fileName,
            }
            if (r.code == 1148)
                r.messageText = Util.lf("all symbols in top-level scope are always exported; please use a namespace if you want to export only some")
            return r
        })
    }

    export function compile(opts: CompileOptions) {
        let startTime = Date.now()
        let res: CompileResult = {
            outfiles: {},
            diagnostics: [],
            success: false,
            times: {},
        }

        if (opts.target.taggedInts)
            opts.target.floatingPoint = true

        if (!opts.target.isNative)
            opts.target.taggedInts = false

        let fileText: { [index: string]: string } = {};
        for (let fileName in opts.fileSystem) {
            fileText[normalizePath(fileName)] = opts.fileSystem[fileName];
        }

        let setParentNodes = true
        let options = getTsCompilerOptions(opts)

        let host: CompilerHost = {
            getSourceFile: (fn, v, err) => {
                fn = normalizePath(fn)
                let text = ""
                if (fileText.hasOwnProperty(fn)) {
                    text = fileText[fn]
                } else {
                    if (err) err("File not found: " + fn)
                }
                return createSourceFile(fn, text, v, setParentNodes)
            },
            fileExists: fn => {
                fn = normalizePath(fn)
                return fileText.hasOwnProperty(fn)
            },
            getCanonicalFileName: fn => fn,
            getDefaultLibFileName: () => "no-default-lib.d.ts",
            writeFile: (fileName, data, writeByteOrderMark, onError) => {
                res.outfiles[fileName] = data
            },
            getCurrentDirectory: () => ".",
            useCaseSensitiveFileNames: () => true,
            getNewLine: () => "\n",
            readFile: fn => {
                fn = normalizePath(fn)
                return fileText[fn] || "";
            },
            directoryExists: dn => true,
        }

        if (!opts.sourceFiles)
            opts.sourceFiles = Object.keys(opts.fileSystem)

        let tsFiles = opts.sourceFiles.filter(f => U.endsWith(f, ".ts"))
        // ensure that main.ts is last of TS files
        let tsFilesNoMain = tsFiles.filter(f => f != "main.ts")
        if (tsFiles.length > tsFilesNoMain.length) {
            tsFiles = tsFilesNoMain
            tsFiles.push("main.ts")
        }
        // TODO: ensure that main.ts is last???
        let program = createProgram(tsFiles, options, host);

        // First get and report any syntactic errors.
        res.diagnostics = patchUpDiagnostics(program.getSyntacticDiagnostics());
        if (res.diagnostics.length > 0) {
            if (opts.forceEmit) {
                pxt.debug('syntactic errors, forcing emit')
                compileBinary(program, host, opts, res);
            }
            return res;
        }

        // If we didn't have any syntactic errors, then also try getting the global and
        // semantic errors.
        res.diagnostics = patchUpDiagnostics(program.getOptionsDiagnostics().concat(program.getGlobalDiagnostics()));

        if (res.diagnostics.length == 0) {
            res.diagnostics = patchUpDiagnostics(program.getSemanticDiagnostics());
        }

        let emitStart = Date.now()
        res.times["typescript"] = emitStart - startTime

        if (opts.ast) {
            res.ast = program
        }

        if (opts.ast || opts.forceEmit || res.diagnostics.length == 0) {
            const binOutput = compileBinary(program, host, opts, res);
            res.times["compilebinary"] = Date.now() - emitStart
            res.diagnostics = patchUpDiagnostics(binOutput.diagnostics)
        }

        if (res.diagnostics.length == 0)
            res.success = true

        for (let f of opts.sourceFiles) {
            if (Util.startsWith(f, "built/"))
                res.outfiles[f.slice(6)] = opts.fileSystem[f]
        }

        return res
    }

    export function decompile(opts: CompileOptions, fileName: string) {
        const resp = compile(opts);
        if (!resp.success) return resp;

        let file = resp.ast.getSourceFile(fileName);
        const apis = getApiInfo(resp.ast);
        const blocksInfo = pxtc.getBlocksInfo(apis);
        const bresp = pxtc.decompiler.decompileToBlocks(blocksInfo, file, { snippetMode: false }, pxtc.decompiler.buildRenameMap(resp.ast, file))
        return bresp;
    }

    function normalizePath(path: string): string {
        path = path.replace(/\\/g, "/");

        const parts: string[] = [];
        path.split("/").forEach(part => {
            if (part === ".." && parts.length) {
                parts.pop();
            }
            else if (part !== ".") {
                parts.push(part)
            }
        });

        return parts.join("/");
    }
}