#!/usr/bin/env tsx

/**
 * Auth0 Post-Login Action API テストスクリプト
 *
 * このスクリプトは、Auth0のPost-Login ActionからTumiki APIへの
 * ユーザー同期リクエストをローカル環境でテストするために使用します。
 */

interface UserData {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
}

interface ApiResponse {
  success: boolean;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
  error?: string;
  details?: unknown;
}

interface TestResult {
  status: number | string;
  data?: ApiResponse;
  error?: string;
  success: boolean;
}

interface TestCase {
  name: string;
  data: UserData;
  expectError?: boolean;
}

const API_ENDPOINT = "http://localhost:3000/api/auth/sync-user";
const API_SECRET = "webhook_secret_for_post_login_action_12345";

/**
 * テスト対象のユーザーデータ
 */
const testUsers: TestCase[] = [
  {
    name: "正常ケース - 新規ユーザー",
    data: {
      sub: "auth0|test_user_001",
      name: "Test User 001",
      email: "test001@example.com",
      picture: "https://example.com/avatar001.jpg",
    },
  },
  {
    name: "正常ケース - 既存ユーザー更新",
    data: {
      sub: "auth0|test_user_002",
      name: "Updated User 002",
      email: "updated002@example.com",
      picture: "https://example.com/avatar002.jpg",
    },
  },
  {
    name: "最小データケース - subのみ",
    data: {
      sub: "auth0|test_user_003",
    },
  },
  {
    name: "エラーケース - subなし",
    data: {
      name: "No Sub User",
      email: "nosub@example.com",
    },
    expectError: true,
  },
  {
    name: "エラーケース - 無効なemail",
    data: {
      sub: "auth0|test_user_004",
      name: "Invalid Email User",
      email: "invalid-email",
    },
    expectError: true,
  },
];

/**
 * APIリクエストを送信する関数
 */
const sendRequest = async (
  userData: UserData,
  _expectError = false,
): Promise<TestResult> => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_SECRET}`,
      },
      body: JSON.stringify(userData),
    });

    const responseData = (await response.json()) as ApiResponse;

    return {
      status: response.status,
      data: responseData,
      success: response.ok,
    };
  } catch (error) {
    return {
      status: "FETCH_ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
};

/**
 * 認証エラーのテスト
 */
const testAuthenticationError = async (): Promise<void> => {
  console.log("\n🔐 認証エラーテスト");

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_secret",
      },
      body: JSON.stringify({
        sub: "auth0|test_user_auth",
        name: "Auth Test User",
        email: "auth@example.com",
      }),
    });

    const responseData = (await response.json()) as ApiResponse;

    if (response.status === 401) {
      console.log("✅ 認証エラーテスト成功: 401 Unauthorized");
      console.log("   レスポンス:", responseData);
    } else {
      console.log("❌ 認証エラーテスト失敗: 401以外のステータス");
      console.log("   ステータス:", response.status);
      console.log("   レスポンス:", responseData);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log("❌ 認証エラーテスト失敗:", errorMessage);
  }
};

/**
 * CORSテスト
 */
const testCORS = async (): Promise<void> => {
  console.log("\n🌐 CORSテスト");

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "OPTIONS",
    });

    const corsHeaders = {
      "Access-Control-Allow-Origin": response.headers.get(
        "Access-Control-Allow-Origin",
      ),
      "Access-Control-Allow-Methods": response.headers.get(
        "Access-Control-Allow-Methods",
      ),
      "Access-Control-Allow-Headers": response.headers.get(
        "Access-Control-Allow-Headers",
      ),
    };

    if (response.ok) {
      console.log("✅ CORSテスト成功");
      console.log("   CORS Headers:", corsHeaders);
    } else {
      console.log("❌ CORSテスト失敗");
      console.log("   ステータス:", response.status);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log("❌ CORSテスト失敗:", errorMessage);
  }
};

/**
 * パフォーマンステスト
 */
const testPerformance = async (): Promise<void> => {
  console.log("\n⚡ パフォーマンステスト");

  const testData: UserData = {
    sub: "auth0|perf_test_user",
    name: "Performance Test User",
    email: "perf@example.com",
    picture: "https://example.com/perf-avatar.jpg",
  };

  const iterations = 5;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    const result = await sendRequest(testData);
    const endTime = Date.now();
    const duration = endTime - startTime;

    times.push(duration);

    if (result.success) {
      console.log(`   ${i + 1}回目: ${duration}ms ✅`);
    } else {
      console.log(`   ${i + 1}回目: ${duration}ms ❌ (${result.status})`);
    }
  }

  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`📊 パフォーマンス統計:`);
  console.log(`   平均レスポンス時間: ${averageTime.toFixed(2)}ms`);
  console.log(`   最小レスポンス時間: ${minTime}ms`);
  console.log(`   最大レスポンス時間: ${maxTime}ms`);
};

/**
 * メインテスト実行関数
 */
const runTests = async (): Promise<void> => {
  console.log("🚀 Auth0 Post-Login Action API テスト開始");
  console.log("📍 エンドポイント:", API_ENDPOINT);
  console.log("🔑 シークレット:", "設定済み");

  // CORSテスト
  await testCORS();

  // 認証エラーテスト
  await testAuthenticationError();

  // 各ユーザーデータのテスト
  console.log("\n📊 ユーザーデータテスト");

  let successCount = 0;
  let errorCount = 0;

  for (const [index, testCase] of testUsers.entries()) {
    console.log(`\n${index + 1}. ${testCase.name}`);
    console.log("   送信データ:", JSON.stringify(testCase.data, null, 2));

    const result = await sendRequest(testCase.data, testCase.expectError);

    if (testCase.expectError) {
      if (!result.success) {
        console.log("✅ エラーケーステスト成功");
        console.log("   ステータス:", result.status);
        console.log("   エラー詳細:", result.data ?? result.error);
        successCount++;
      } else {
        console.log("❌ エラーケーステスト失敗: エラーが期待されたが成功した");
        console.log("   レスポンス:", result.data);
        errorCount++;
      }
    } else {
      if (result.success) {
        console.log("✅ 正常ケーステスト成功");
        console.log("   ユーザーID:", result.data?.user?.id);
        console.log("   ユーザー名:", result.data?.user?.name);
        console.log("   メール:", result.data?.user?.email);
        console.log("   ロール:", result.data?.user?.role);
        successCount++;
      } else {
        console.log("❌ 正常ケーステスト失敗");
        console.log("   ステータス:", result.status);
        console.log("   エラー詳細:", result.data ?? result.error);
        errorCount++;
      }
    }
  }

  // パフォーマンステスト
  await testPerformance();

  // 結果サマリー
  console.log("\n📈 テスト結果サマリー");
  console.log(`   成功: ${successCount}件`);
  console.log(`   失敗: ${errorCount}件`);
  console.log(`   合計: ${successCount + errorCount}件`);
  console.log(
    `   成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`,
  );

  console.log("\n🏁 テスト完了");
  console.log("\n📝 注意事項:");
  console.log(
    "   - ローカル開発サーバー (localhost:3000) が起動していることを確認してください",
  );
  console.log("   - データベースが正常に接続されていることを確認してください");
  console.log(
    "   - 環境変数 AUTH0_WEBHOOK_SECRET が設定されていることを確認してください",
  );
};

/**
 * エラーハンドリング付きメイン実行関数
 */
const main = async (): Promise<void> => {
  try {
    await runTests();
    process.exit(0);
  } catch (error) {
    console.error("💥 テスト実行中にエラーが発生しました:", error);
    process.exit(1);
  }
};

// スクリプトが直接実行された場合にテストを開始
if (require.main === module) {
  void main();
}

export { runTests, sendRequest, testAuthenticationError, testCORS };
