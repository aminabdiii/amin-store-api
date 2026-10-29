export default {
  meta: {
    type: 'layout',
    docs: { description: 'Put each declaration decorator on its own line.' },
    fixable: 'whitespace',
    schema: [],
    messages: { newline: 'Put each decorator and the decorated declaration on separate lines.' },
  },
  create(context) {
    return {
      Decorator(node) {
        if (
          ![
            'ClassDeclaration',
            'ClassExpression',
            'MethodDefinition',
            'PropertyDefinition',
          ].includes(node.parent.type)
        )
          return;
        const next = context.sourceCode.getTokenAfter(node);
        if (!next || next.loc.start.line !== node.loc.end.line) return;
        context.report({
          node,
          messageId: 'newline',
          fix(fixer) {
            const between = context.sourceCode.text.slice(node.range[1], next.range[0]);
            if (between.trim()) return null;
            return fixer.replaceTextRange(
              [node.range[1], next.range[0]],
              '\n' + ' '.repeat(node.loc.start.column),
            );
          },
        });
      },
    };
  },
};
