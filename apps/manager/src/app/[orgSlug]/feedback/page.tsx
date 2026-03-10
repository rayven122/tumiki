import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { FeedbackForm } from "@/features/feedback/components/FeedbackForm";

const FeedbackPage = async () => {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold">フィードバック</h1>
        <p className="text-muted-foreground mt-1">
          お問い合わせや機能要望をお送りください
        </p>
      </div>

      {/* フィードバックフォーム */}
      <Card>
        <CardHeader>
          <CardTitle>新しいフィードバック</CardTitle>
        </CardHeader>
        <CardContent>
          <FeedbackForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackPage;
