const path = require('path');

module.exports = {
  entry: {
    app: path.join(__dirname, 'src', 'app.tsx'),
    background: path.join(__dirname, 'src', 'background.tsx'),
    contentScript: path.join(__dirname, 'src', 'content-script.tsx')
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
  output: {
    path: path.join(__dirname, '..', 'scripts'),
    filename: '[name].js'
  }
};
