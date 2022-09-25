import CopyPlugin from 'copy-webpack-plugin';
import WebExtPlugin from 'web-ext-plugin-cjs';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import path from 'path';

const generateManifest = (build: string, content: Buffer) => {
  const buildKey = '__build'
  const template = JSON.parse(content.toString());
  const nodePackage = require('./package.json');

  const replaceBuildVariables = (jsObject: Object, buildKey: string, build: string) => {
    for (const [key, value] of Object.entries(jsObject)) {
      const isValueObject = typeof value === 'object' && value !== null
      if (key === buildKey) {
        if (isValueObject) {
          if (Object.keys(value).includes(build)) {
            return value[build];
          } else {
            return undefined;
          }
        } else {
          throw new Error(`Invalid manifest-template file. Expected an object for key ${buildKey}, got something else instead.`)
        }
      } else if (isValueObject) {
        const replacedValue = replaceBuildVariables(value, buildKey, build);
        if (typeof replacedValue !== 'undefined') {
          jsObject[key as keyof Object] = replacedValue;
        } else {
          delete jsObject[key as keyof Object];

          if (Array.isArray(jsObject)) {
            jsObject = jsObject.filter(Boolean);
          }
        }
      }
    }

    return jsObject;
  }

  template.version = nodePackage.version;

  return JSON.stringify(replaceBuildVariables(template, buildKey, build), null, 2);
}

module.exports = async () => {
  const build = process.env.REACT_APP_EXT_BUILD || 'chrome';

  const copyPatterns = [
    {
      from: 'public/manifest-template.json', to: 'manifest.json', transform(content: Buffer) {
        return generateManifest(build, content);
      },
    },
    {
      from: '!(index.html|manifest-template.json|background.js)/**', context: 'public/'
    }
  ]

  if (build !== 'chrome') {
    copyPatterns.push({ from: 'background.js', context: 'public' });
  }

  return {
    devServer: {
      devMiddleware: {
        writeToDisk: true
      }
    },
    webpack: {
      configure: (webpackConfig: any, { paths }: any) => {
        paths.appBuild = webpackConfig.output.path = path.resolve(`build/${build}`);
        return webpackConfig;
      },
      plugins: [
        new CleanWebpackPlugin({
          cleanOnceBeforeBuildPatterns: ['**/*']
        }),
        new CopyPlugin({
          patterns: copyPatterns
        }),
        new WebExtPlugin({
          sourceDir: 'build/chrome',
          target: 'chromium',
          runLint: false,
          chromiumProfile: 'profile/chromium',
          keepProfileChanges: true
        })
      ]
    }
  }
}