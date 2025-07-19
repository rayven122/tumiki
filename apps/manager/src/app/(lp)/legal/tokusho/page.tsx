"use client";

import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";

export default function TokushoPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">
            特定商取引法に基づく表記
          </h1>

          <div className="prose prose-gray max-w-none">
            <div className="space-y-8">
              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  事業者名
                </h2>
                <p className="text-gray-700">株式会社RAYVEN</p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  法人番号
                </h2>
                <p className="text-gray-700">7120001267438</p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  所在地
                </h2>
                <p className="text-gray-700">
                  〒573-1157
                  <br />
                  大阪府枚方市片鉾本町２６－７サンエース片鉾ビル３１０
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  電話番号
                </h2>
                <p className="text-gray-700">
                  未掲載（お問い合わせはメールにて承ります）
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  メールアドレス
                </h2>
                <p className="text-gray-700">s.yoshihiro@rayven.cloud</p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  運営責任者
                </h2>
                <p className="text-gray-700">代表取締役 鈴山佳宏</p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  販売価格
                </h2>
                <div className="text-gray-700">
                  <p className="mb-2">
                    <strong>ベーシックプラン:</strong> 月額980円（税込）
                  </p>
                  <p className="mb-2">
                    <strong>プロプラン:</strong> 月額2,980円（税込）
                  </p>
                  <p className="mb-2">
                    <strong>エンタープライズプラン:</strong> 要相談
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  商品代金以外の必要料金
                </h2>
                <p className="text-gray-700">なし</p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  支払い方法
                </h2>
                <p className="text-gray-700">
                  クレジットカード（Visa、MasterCard、JCB、American Express）
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  支払い時期
                </h2>
                <p className="text-gray-700">
                  サービス申込み時に決済いたします。月額プランは毎月同日に自動決済されます。
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  サービス提供時期
                </h2>
                <p className="text-gray-700">
                  決済完了後、即時サービス利用開始可能です。
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  キャンセル・解約について
                </h2>
                <div className="space-y-3 text-gray-700">
                  <p>
                    <strong>解約方法:</strong>
                    <br />
                    サービスの解約は、マイページの「アカウント設定」からいつでも可能です。
                  </p>
                  <p>
                    <strong>解約のタイミング:</strong>
                    <br />
                    次回請求日の24時間前までに解約手続きを完了した場合、その請求日以降の課金は発生いたしません。
                  </p>
                  <p>
                    <strong>返金について:</strong>
                    <br />
                    本サービスは月額制のサブスクリプションサービスです。サービスの性質上、既にお支払いいただいた料金に対する日割り計算や返金は行っておりません。ただし、当社の都合によりサービスを停止する場合は、未利用期間分を返金いたします。
                  </p>
                  <p>
                    <strong>無料お試し期間について:</strong>
                    <br />
                    初回登録時に提供される無料お試し期間中にキャンセルされた場合、料金は一切発生いたしません。
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  交換・返品について
                </h2>
                <p className="text-gray-700">
                  本サービスはデジタルコンテンツのため、商品の性質上、交換・返品はお受けできません。
                  ただし、技術的な問題により正常にサービスをご利用いただけない場合は、
                  速やかに対応させていただきますので、サポートまでお問い合わせください。
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  免責事項
                </h2>
                <div className="space-y-2 text-gray-700">
                  <p>
                    当サービスの利用により生じた損害について、当社は一切の責任を負いません。
                  </p>
                  <p>
                    メンテナンスやシステム障害等により、一時的にサービスがご利用いただけない場合がございます。
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  個人情報の取り扱い
                </h2>
                <p className="text-gray-700">
                  お客様の個人情報については、当社プライバシーポリシーに基づき適切に管理いたします。
                  詳細は
                  <a
                    href="/legal/privacy"
                    className="text-blue-600 hover:underline"
                  >
                    プライバシーポリシー
                  </a>
                  をご確認ください。
                </p>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <p className="text-sm text-gray-600">
                  制定日: 2024年7月1日
                  <br />
                  最終更新日: 2024年7月1日
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
