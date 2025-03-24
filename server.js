const express = require('express');
const path = require('path');
const app = express();

// 静的ファイル提供
app.use(express.static(path.join(__dirname, 'build')));

// すべてのリクエストをindex.htmlにリダイレクト（SPA対応）
app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
