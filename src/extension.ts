import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('插件加载成功');

    let timeout: NodeJS.Timer | undefined = undefined;
    const snakeDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: { id: 'myextension.sneakBackground' }
    });
    let activeEditor = vscode.window.activeTextEditor;
    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        const textRegEx = /(['|"|`])([^'"`]|\s)*\1/g;
        const charCodeRegEx = /(，|。|‘|’|“|”|？|！)/g;
        const text = activeEditor.document.getText();
        const sneakCharCodes: vscode.DecorationOptions[] = [];
        let match;
        while ((match = textRegEx.exec(text))) {
            const initialText = match[0];
            const hasChinese = isChineseChar(initialText);
            const hasChineseMark = isChineseMark(initialText);
            if (hasChinese || !hasChineseMark) {
                continue;
            }
            let charCodeMatch;
            while ((charCodeMatch = charCodeRegEx.exec(initialText))) {
                const startIndex = match.index + charCodeMatch.index;
                const startPos = activeEditor.document.positionAt(startIndex);
                const endPos = activeEditor.document.positionAt(startIndex + 1);
                const decoration = {
                    range: new vscode.Range(startPos, endPos),
                    hoverMessage: '这是一个中文标点'
                };
                sneakCharCodes.push(decoration);
            }
        }
        activeEditor.setDecorations(snakeDecorationType, sneakCharCodes);
    }

    function isChineseChar(str: string) {
        var reg = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
        return reg.test(str);
    }
    function isChineseMark(str: string) {
        var reg = /(，|。|‘|’|“|”|？|！)/;
        return reg.test(str);
    }

    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateDecorations, 500);
    }

    if (activeEditor) {
        triggerUpdateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(
        editor => {
            activeEditor = editor;
            if (editor) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions
    );

    vscode.workspace.onDidChangeTextDocument(
        event => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions
    );
}

export function deactivate() {}
