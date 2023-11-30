const doc = {
  _sanityRev: 'mFLAFxLwsxhwYiBCLU6TVx',
  _sanityContext:
    '\n        <h1>Preview translated content</h1>\n        <p>Find the preview for this content by clicking below:</p>\n        <p>\n          <a style="display: inline-block; background: papayawhip; padding: 0.5em 1em;" href="https://mulungood.com">\n            See preview\n          </a>\n        </p>\n      ',
  contentByPath: {
    title: 'Phrase comparison to Transifex',
    body: [
      {
        _type: 'block',
        _blockMeta: { _type: 'block', style: 'normal', _key: '3081bd61e857' },
        _spanMeta: {
          '60b1c785d08e': { _type: 'span', marks: [], _key: '60b1c785d08e' },
          '6d15c287620f': {
            _type: 'span',
            marks: ['em'],
            _key: '6d15c287620f',
          },
          '15986853ae23': { _type: 'span', marks: [], _key: '15986853ae23' },
          '6b04a53a7cfe': {
            _type: 'span',
            marks: ['strong'],
            _key: '6b04a53a7cfe',
          },
          '2cc323c43845': { _type: 'span', marks: [], _key: '2cc323c43845' },
        },
        inlineBlocksData: {},
        serializedHtml:
          '<s data-key="60b1c785d08e">This is some </s> <s data-key="6d15c287620f">rich</s> <s data-key="15986853ae23"> text, its meta information should be </s> <s data-key="6b04a53a7cfe">ignored</s> <s data-key="2cc323c43845">.</s>',
        markDefs: [],
      },
      {
        _type: 'image',
        _key: 'cea3f4dd2c45',
        asset: {
          _ref: 'image-477b098e271d8be8c14178c1fc194c5386eeb21f-512x512-png',
          _type: 'reference',
        },
      },
    ],
  },
}

function getAllPaths(obj: any, currentPath: string = ''): string[] {
  let paths: string[] = []

  for (let key in obj) {
    if (obj[key] && typeof obj[key] === 'object') {
      const newPath = currentPath ? `${currentPath}/${key}` : key

      if (Array.isArray(obj[key])) {
        for (let i = 0; i < obj[key].length; i++) {
          paths = paths.concat(getAllPaths(obj[key][i], `${newPath}[${i}]`))
        }
      } else {
        paths = paths.concat(getAllPaths(obj[key], newPath))
      }
    } else {
      paths.push(currentPath ? `${currentPath}/${key}` : key)
    }
  }

  return paths
}

// console.log()

getAllPaths(doc).map((path) => {
  console.log(`\n${path}`)
})
