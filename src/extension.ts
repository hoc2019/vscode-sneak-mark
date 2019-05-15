import * as vscode from 'vscode';
let myStatusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('插件加载成功');
    //更新页面标记计时器
    let timeout: NodeJS.Timer | undefined = undefined;
    //创建问题诊断集合
    const collection = vscode.languages.createDiagnosticCollection('sneak');
    //获取配置中异常中文标点的样式
    let sneakDecorationType = getSneakDecorationType();
    //匹配需要标识出的标点符号，计划后期可添加配置
    const charCodeRegEx = /(，|。|‘|’|“|”|？|！)/g;
    //编辑中页面
    let activeEditor = vscode.window.activeTextEditor;
    //更新页面标记
    function updateDecorations() {
        //如果没有编辑中页面直接退出
        if (!activeEditor) {
            return;
        }
        //匹配被'',"",``符号包裹的文本
        const textRegEx = /(['"`])[\s\S]*?\1/g;
        //获取编辑中页面的文本信息
        const text = activeEditor.document.getText();
        //装饰集（这里就是需要被修改样式的异常中文标点）
        const sneakCharCodes: vscode.DecorationOptions[] = [];
        //匹配到被''""``包裹的异常字符串的正则对象
        let match;
        //异常中文标点诊断信息列表
        const diagnosticList = [];
        //循环每一个被''""``包裹的异常字符串
        while ((match = textRegEx.exec(text))) {
            //被''""``包裹的字符串
            const initialText = match[0];
            //字符串中是否包含中文
            const hasChinese = isChineseChar(initialText);
            //字符串中是否含有异常中文标点
            const hasChineseMark = isChineseMark(initialText);
            //若果存在中文或没有中文标点则跳过后续步骤执行下一次循环
            if (hasChinese || !hasChineseMark) {
                continue;
            }
            //筛选出异常字符串中的异常中文标点
            let charCodeMatch;
            //循环异常字符串中的每一个字符
            while ((charCodeMatch = charCodeRegEx.exec(initialText))) {
                //异常中文标点实际开始位置为异常字符串的位置+异常中文标点在异常字符串的位置
                const startIndex = match.index + charCodeMatch.index;
                //异常中文标点的开始位置
                const startPos = activeEditor.document.positionAt(startIndex);
                //异常中文标点结束位置，这几个要检测的标点只占一个位置，加1即可
                const endPos = activeEditor.document.positionAt(startIndex + 1);
                //异常中文标点的诊断信息，问题诊断面版要用到
                diagnosticList.push({
                    // code: 'hhh',
                    message: '异常中文标点', //问题诊断面版展示的说明信息
                    range: new vscode.Range(startPos, endPos), //问题诊断面版展示位置信息，点击可跳转相应位置
                    severity: vscode.DiagnosticSeverity.Warning //问题类型
                    // source: ''
                });
                //异常中文标点的范围
                const decoration = {
                    range: new vscode.Range(startPos, endPos)
                };
                //对异常中文标点的范围应用设定好的修饰样式
                sneakCharCodes.push(decoration);
            }
        }
        //问题诊断面版添加异常中文标点相关信息
        collection.set(activeEditor.document.uri, diagnosticList);
        //更新状态栏统计异常中文标点个数
        updateStatusBarItem(sneakCharCodes.length);
        //激活中的编辑页面中文异常标点位置添加样式
        activeEditor.setDecorations(sneakDecorationType, sneakCharCodes);
    }
    //获取选项设置里面设置的样式信息，这里暂时只有一个背景颜色。
    function getSneakDecorationType() {
        const markColor = vscode.workspace
            .getConfiguration()
            .get('sneakMark.markColor');
        return vscode.window.createTextEditorDecorationType({
            backgroundColor: markColor
        });
    }
    //判断是否存在中文标点
    function isChineseMark(str: string) {
        //此处正则匹配注意与之前的匹配不同，不能加g。
        const charCodeRegEx = /(，|。|‘|’|“|”|？|！)/;
        return charCodeRegEx.test(str);
    }
    //判断是否存在中文
    function isChineseChar(str: string) {
        var reg = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
        return reg.test(str);
    }
    //触发页面中中文异常标点位置的样式更新
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateDecorations, 500);
    }
    //启动时存在打开的编辑页面触发一次样式更新
    if (activeEditor) {
        triggerUpdateDecorations();
    }
    //切换编辑页面事件，会触发样式更新
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
    //编辑页面中的内容变化，会触发样式更新
    vscode.workspace.onDidChangeTextDocument(
        event => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions
    );
    //更改选项中的设置会重新获取样式信息
    vscode.workspace.onDidChangeConfiguration(() => {
        sneakDecorationType = getSneakDecorationType();
    });
    //状态栏统计信息位置
    myStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    context.subscriptions.push(myStatusBarItem);
}
//状态栏展示异常标点统计
function updateStatusBarItem(num: number): void {
    if (num < 0) {
        return;
    }
    myStatusBarItem.text = `存在${num}个异常标点`;
    myStatusBarItem.show();
}
