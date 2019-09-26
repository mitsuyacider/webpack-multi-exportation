const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const { lstatSync, readdirSync, statSync, readFile, createReadStream, createWriteStream, mkdirsSync  } = require('fs-extra');
const { join, resolve, dirname, relative } = require('path');
const isDirectory = source => lstatSync(source).isDirectory();
const isFile = source => source !== undefined && lstatSync(source).isFile();

const commonModules = [
  resolve(__dirname, './src/common'), 
];

// NOTE: Change your support browser if needed.
const supportedBrowsers = [
  'last 3 versions',    // http://browserl.ist/?q=last+3+versions
  'ie >= 11',           // http://browserl.ist/?q=ie+%3E%3D+10
  'edge >= 12',         // http://browserl.ist/?q=edge+%3E%3D+12
  'firefox >= 28',      // http://browserl.ist/?q=firefox+%3E%3D+28
  'chrome >= 21',       // http://browserl.ist/?q=chrome+%3E%3D+21
  'safari >= 6.1',      // http://browserl.ist/?q=safari+%3E%3D+6.1
  'opera >= 12.1',      // http://browserl.ist/?q=opera+%3E%3D+12.1
  'ios >= 7',           // http://browserl.ist/?q=ios+%3E%3D+7
  'android >= 4.4',     // http://browserl.ist/?q=android+%3E%3D+4.4
  'blackberry >= 10',   // http://browserl.ist/?q=blackberry+%3E%3D+10
  'operamobile >= 12.1',// http://browserl.ist/?q=operamobile+%3E%3D+12.1
  'samsung >= 4',       // http://browserl.ist/?q=samsung+%3E%3D+4
];

// NOTE: Babel Config including support browser.
const babelConfig = { targets: { browsers: supportedBrowsers } };

// NOTE: Use function in order to pass environment variables.
// @see https://webpack.js.org/guides/environment-variables/
module.exports = (env, {watch} ) => {
  // NOTE: Create entry configuration.
  const entry = createEntryConfig(env);
  const enableCopyFile = env && env.enableCopy

  // NOTE: Exclude files for watch option.
  const watchOptions = {
    ignored: ['node_modules']
  }

  if (env && env.shallowWatch) {
    // NOTE: Exclude common modules from watch target.
    watchOptions.ignored.push(...commonModules);
  }

  // NOTE: Final configuration for webpack.
  return {
    mode: 'production',
    entry: entry,
    watchOptions: watchOptions,
    output: {
      path: __dirname,
      filename: '[name]'
    },
    module: {
      rules: [{ 
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
              loader: 'babel-loader',
              options: {
                presets: [['@babel/preset-env', babelConfig]]
              }
            }
      }]
    },
    resolve : {
      modules : commonModules
    },
    optimization: {
      // NOTE: Use multi-process parallel running to improve the build speed
      //       If you have as much cpu core, set it to parallel: 4. Then the build speed will be shortened sharply.
      minimizer: [new UglifyJsPlugin({
        parallel: true,
        cache: true
      })],
    },
    plugins: [
      new CopyFilePlugin({enableCopy: enableCopyFile})
    ]
  };
}

/** ======================================
	Functions
	======================================= */
/**
 * 
 * @param {String} dir Scanning directory
 * @return {Array[String]} File paths including sub directories.
 */
function getAllFiles(dir) {
  const result = []  

  const fileList = (dirPath => {
    readdirSync(dirPath)
      .map(source => join(dirPath, source))
      .filter(source => {

        if (isDirectory(source)) {
          // NOTE: Recursive call until getting only files in the directory
          fileList(source)
        }

        if (isFile(source)) {
          result.push(source)
        }
      })
  });

  fileList(dir);
  return result;
}

/**
 * NOTE: Check if the file or directory exists.
 * @param {String} source ファイル or ディレクトリパス
 */
function isTargetExist(source) {
  try {
    statSync(source);
    return true
  } catch(err) {
    if(err.code === 'ENOENT') return false
  }
}

/**
 * NOTE: Create entry configuration.
 * @return {Object} 
 */
function createEntryConfig(env) {
  let entry = {};

  if (env && env.target) {
    // NOTE: Divide target string into array by comma.
    const targetFiles = env.target.split(',').map(s => s.trim())

    for (file of targetFiles) {
      const targetDir = './' + join('src', 'projects', file);

      const isExist = isTargetExist(targetDir);
      console.assert(isExist, `The passed target ${targetDir} doesn't exist. Make sure your input.`);
  
      const filePath = './' + join(targetDir, 'app.js');
      const anEntry = createEntry(filePath);
      Object.assign(entry, anEntry);
    }
  } else {
    entry = createAllEntry();
  }

  return entry;
}

/**
 * NOTE: Create all entry
 * @return {Array[String]} All entry infomation
 */
function createAllEntry() {
  const dirPath = resolve(__dirname, 'src', 'projects');

  // NOTE: Get all path under 'src/projects' directory
  //       and extract only app.js
  const appFiles = getAllFiles(dirPath)
    .filter(source => /app.js/.test(source))
    .map(source => relative('', source));

  let entry = {}

  for (file of appFiles) {
    const anEntry = createEntry(file);
    entry = Object.assign(entry, anEntry);
  }

  return entry;
}

/**
 * NOTE: Create an entry configuration.
 * @param {String} filePath Project file path
 * @return {Object} an entry configuration
 * @code 
 * {
 *  './src/projects/path-to-project/dist/hashfilename.js': './src/projects/path-to-project/app.js',
 * }
 */
function createEntry(filePath) {
  const entry = {}  
  const dir = dirname(filePath);
  const filename = getLastPathName(dir) + '.js';
  const outputPath = './' + join(dir, 'dist', filename);
  entry[outputPath] = './' + filePath;

  return entry;
}

/**
 * NOTE: Extract last node from path
 * @param {String} source Path
 * @return End of the node.
 * @example /abc/def/ghi => ghi, /hoge/fuga/foo.js => foo.js
 */
function getLastPathName(source) {
  const regExp = /([^\/]*)\/*$/;
  const result = source.match(regExp);

  return result[0];
}

/**
 * NOTE: Extract source path from a directory. 
 *       The result doesn't include return value.
 * @param {String} source path
 * @param {String} fromDirectory Extract source path from this parameter
 */
function extractPath(source, fromDirectory) {
  const reg = new RegExp(`(?<=src\/${fromDirectory}\/).+`, 'g');
  const result = source.match(reg);

  return result[0];
}

/** ======================================
	Plugins
	======================================= */
class CopyFilePlugin {
  
  constructor({enableCopy = false}) {
    this.enableCopy = enableCopy;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap('CopyFilePlugin', compilation => {

      if (!this.enableCopy) return;

      const entry = compilation.options.entry;

      for (let emittedFile in entry) {
        // NOTE: Support to copy compiled file to public folder as a default.
        const compiledFile = entry[emittedFile];
        const targetDir = extractPath(dirname(compiledFile), 'projects');
        const serverPath = join(__dirname, './public', targetDir);

        this.copyFileToOtherDirecotry(emittedFile, serverPath, 'bundle.js');

        // NOTE: Copy it to other folders.
        const targetDirPath = dirname(compiledFile);
        const outputConfigFile = join(targetDirPath, 'output.json');

        if (isTargetExist(outputConfigFile)) {            
          this.getOtherOutputPaths(outputConfigFile)
          .then(filePaths => {
            for (let filePath of filePaths) {
              this.copyFileToOtherDirecotry(emittedFile, filePath.dir, filePath.filename)
            }
          })
          .catch(e => {
            console.assert(e.path, `The passed target in the output.json doesn't exist. Make sure your input.`);
          })
        }
      }
    });
  }

  copyFileToOtherDirecotry(sourceFile, targetDir, replaceFilename) {
    // NOTE: If target directory doesn't exist, creates new one.
    if (!isTargetExist(targetDir)) {
      console.log(targetDir)
      mkdirsSync(targetDir);
    }

    const filename = replaceFilename || getLastPathName(sourceFile);
    const outputFile = join(targetDir, filename);

    // Added in: v8.5.0
    // fs.copyFileSync(emittedFile, serverPath);
    createReadStream(sourceFile).pipe(createWriteStream(outputFile));
  }

  getOtherOutputPaths(outputConfigFile) {
    return new Promise ( (resolve, reject) => {
      readFile(outputConfigFile, 'utf-8', (err, data) => {
        if (err) {
          reject(outputConfigFile);
        } else {
          resolve(JSON.parse(data));
        }
      });
    })
  }
}