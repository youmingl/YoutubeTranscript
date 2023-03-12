const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    app: './src/index.tsx',
    background: './src/background.tsx',
    oauth: './src/oauth.tsx'
  },
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: { noEmit: false }
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/login.html'),
      inject: true
    })
  ].filter(Boolean),
  output: {
    publicPath: '',
    filename: '[name].js',
    path: path.resolve(__dirname, '..', 'scripts')
  }
};
