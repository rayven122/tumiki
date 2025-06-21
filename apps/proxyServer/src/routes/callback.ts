import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

/**
 * 認証後のコールバックエンドポイント
 * Managerアプリでの認証完了後、プロキシサーバーの元のURLにリダイレクトする
 */
router.get("/callback", (req: Request, res: Response) => {
  const { returnUrl } = req.query;
  
  if (returnUrl && typeof returnUrl === 'string') {
    try {
      // URLの妥当性をチェック
      const decodedUrl = decodeURIComponent(returnUrl);
      const url = new URL(decodedUrl);
      
      // 同一ホストかチェック（セキュリティ）
      const currentHost = req.get('host');
      if (url.host === currentHost) {
        console.log(`Redirecting back to original URL: ${decodedUrl}`);
        res.redirect(302, decodedUrl);
        return;
      }
    } catch (error) {
      console.error('Invalid return URL:', returnUrl, error);
    }
  }
  
  // デフォルトは /mcp エンドポイントにリダイレクト
  res.redirect(302, '/mcp');
});

/**
 * 認証ステータスページ
 * 認証成功時に表示するシンプルなページ
 */
router.get("/success", (req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #28a745; }
          .button { 
            background-color: #007bff; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 4px; 
            display: inline-block;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1 class="success">✓ Authentication Successful</h1>
        <p>You are now authenticated and can access MCP services.</p>
        <a href="/mcp" class="button">Connect to MCP</a>
        <script>
          // 3秒後に自動的にMCPエンドポイントにリダイレクト
          setTimeout(() => {
            window.location.href = '/mcp';
          }, 3000);
        </script>
      </body>
    </html>
  `);
});

export default router;