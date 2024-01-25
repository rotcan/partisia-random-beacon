const webpackConfig = require("webpack");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const PathPlugin = require("path");
const { merge } = require("webpack-merge");

function path(path) {
  return PathPlugin.join(__dirname, "src", path);
}

module.exports = (env) => {
  const port = env.PORT;

  const configuration = {
    mode: "development",
    devtool: "eval-cheap-module-source-map",
    devServer: {
      historyApiFallback: true,
      port
    }
  };

  return merge(configuration, {
    entry: [path("main/Main")],
    resolve: {
      alias: {
        process: "process/browser"
      },
      extensions: [".ts", ".tsx", ".js"],
      fallback: {
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        assert: require.resolve("assert")
      }
    },
    output: {
      filename: "[name].[chunkhash].js",
      path: PathPlugin.join(__dirname, "target"),
      publicPath: "/"
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          include: path("main"),
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/typescript"
            ]
          }
        },
        {
          test: /\.js$/,
          enforce: 'pre',
          use: [
              {
                  //needed to chain sourcemaps.  see: https://webpack.js.org/loaders/source-map-loader/
                  loader: 'source-map-loader',
                  options: {

                      filterSourceMappingUrl: (url, resourcePath) => {
                          //  console.log({ url, resourcePath }) example:
                          // {
                          //  url: 'index.js.map',
                          //  resourcePath: '/repos/xlib-wsl/common/temp/node_modules/.pnpm/https-proxy-agent@5.0.0/node_modules/https-proxy-agent/dist/index.js'
                          // }

                          if (/.*\/node_modules\/.*/.test(resourcePath)) {
                              return false
                          }
                          return true
                      }

                  }
              }],
      },
      {
        test: /\.(png|jpg|gif|txt)$/,
        use: [
          {
            loader: 'file-loader',
            options: {},
          },
        ],
      },
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          configOverwrite: {
            compilerOptions: {
              noUnusedLocals: false,
              noUnusedParameters: false
            }
          }
        }
      }),
      new HtmlWebpackPlugin({ template: path("main/index.html") }),
      new webpackConfig.ProvidePlugin({ Buffer: ["buffer", "Buffer"], process: "process/browser" })
    ].filter(Boolean)
  });
};
