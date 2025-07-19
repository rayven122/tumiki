"use client";

import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">
            プライバシーポリシー
          </h1>

          <div className="prose prose-gray max-w-none">
            <div className="space-y-8">
              <div>
                <p className="mb-6 text-gray-700">
                  株式会社RAYVEN（以下「当社」といいます。）は、当社が提供するサービス（以下「本サービス」といいます。）における
                  お客様の個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  1. 個人情報の定義
                </h2>
                <p className="text-gray-700">
                  本ポリシーにおいて「個人情報」とは、個人情報保護法に定める「個人情報」を指すものとし、
                  生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、
                  連絡先その他の記述等により特定の個人を識別することができる情報及び容貌、指紋、声紋に係るデータ、
                  及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別することができる情報（個人識別情報）を指します。
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  2. 個人情報の収集方法
                </h2>
                <p className="mb-3 text-gray-700">
                  当社は、以下の方法により個人情報を収集いたします：
                </p>
                <ul className="list-disc space-y-1 pl-6 text-gray-700">
                  <li>お客様がサービス利用登録をする際にご入力いただく情報</li>
                  <li>
                    お客様が本サービスを利用する際に自動的に収集される情報
                  </li>
                  <li>
                    お客様からのお問い合わせやサポート対応時にご提供いただく情報
                  </li>
                  <li>決済サービス提供会社から提供される決済関連情報</li>
                </ul>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  3. 収集する個人情報の種類
                </h2>
                <div className="space-y-3 text-gray-700">
                  <p>
                    <strong>基本情報：</strong>
                  </p>
                  <ul className="list-disc space-y-1 pl-6">
                    <li>氏名、メールアドレス、パスワード</li>
                    <li>組織名、部署名、役職</li>
                    <li>電話番号、住所（任意項目として）</li>
                  </ul>

                  <p>
                    <strong>サービス利用情報：</strong>
                  </p>
                  <ul className="list-disc space-y-1 pl-6">
                    <li>ログイン履歴、アクセス履歴</li>
                    <li>サービス利用状況、設定情報</li>
                    <li>IPアドレス、ブラウザ情報、OS情報</li>
                  </ul>

                  <p>
                    <strong>決済関連情報：</strong>
                  </p>
                  <ul className="list-disc space-y-1 pl-6">
                    <li>決済履歴、請求書情報</li>
                    <li>クレジットカード情報（決済代行会社経由で取得）</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  4. 個人情報の利用目的
                </h2>
                <div className="text-gray-700">
                  <p className="mb-3">
                    当社は、収集した個人情報を以下の目的で利用いたします：
                  </p>
                  <ul className="list-disc space-y-1 pl-6">
                    <li>本サービスの提供、運営、改善</li>
                    <li>お客様へのサポート、お問い合わせ対応</li>
                    <li>料金請求、決済処理</li>
                    <li>重要なお知らせ、サービス関連情報の通知</li>
                    <li>
                      マーケティング、プロモーション活動（同意いただいた場合のみ）
                    </li>
                    <li>利用状況の分析、統計データの作成</li>
                    <li>不正利用の防止、セキュリティの確保</li>
                    <li>法令に基づく対応</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  5. 個人情報の第三者提供
                </h2>
                <div className="space-y-3 text-gray-700">
                  <p>
                    当社は、以下の場合を除き、あらかじめお客様の同意を得ることなく、
                    第三者に個人情報を提供することはありません：
                  </p>
                  <ul className="list-disc space-y-1 pl-6">
                    <li>法令に基づく場合</li>
                    <li>
                      人の生命、身体または財産の保護のために必要がある場合
                    </li>
                    <li>
                      公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合
                    </li>
                    <li>
                      国の機関等が法令の定める事務を遂行することに対して協力する必要がある場合
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  6. 個人情報の委託
                </h2>
                <p className="text-gray-700">
                  当社は、個人情報の取扱いの全部または一部を第三者に委託する場合があります。
                  その場合、委託先における個人情報の安全管理が図られるよう、適切な監督を行います。
                  主な委託先には、クラウドサービス提供会社、決済代行会社、カスタマーサポート業務委託先などが含まれます。
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  7. 個人情報の保存期間
                </h2>
                <p className="text-gray-700">
                  当社は、個人情報を利用目的の達成に必要な期間に限り保有し、その後は適切に削除または匿名化いたします。
                  ただし、法令に基づき保存が必要な場合は、その定める期間保存いたします。
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  8. お客様の権利
                </h2>
                <div className="text-gray-700">
                  <p className="mb-3">
                    お客様は、ご自身の個人情報について以下の権利を有します：
                  </p>
                  <ul className="list-disc space-y-1 pl-6">
                    <li>開示請求：当社が保有する個人情報の開示を求める権利</li>
                    <li>
                      訂正・追加・削除請求：個人情報の訂正、追加、削除を求める権利
                    </li>
                    <li>
                      利用停止・消去請求：個人情報の利用停止、消去を求める権利
                    </li>
                    <li>
                      第三者提供の停止請求：第三者への提供の停止を求める権利
                    </li>
                  </ul>
                  <p className="mt-3">
                    これらの権利を行使される場合は、本ポリシー末尾の連絡先までお問い合わせください。
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  9. セキュリティ対策
                </h2>
                <p className="text-gray-700">
                  当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために、
                  SSL暗号化通信、アクセス制御、定期的なセキュリティ監査など、必要かつ適切な技術的・組織的安全管理措置を講じます。
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  10. Cookie等の取扱い
                </h2>
                <div className="space-y-3 text-gray-700">
                  <p>
                    当社は、お客様により良いサービスを提供するため、Cookieおよび類似の技術を使用することがあります。
                  </p>
                  <p>
                    これらの技術により、サービスの利用状況の分析、お客様の利便性向上、
                    広告の最適化などを行います。
                  </p>
                  <p>
                    お客様は、ブラウザの設定によりCookieを無効にすることができますが、
                    その場合、本サービスの一部機能がご利用いただけない場合があります。
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  11. プライバシーポリシーの変更
                </h2>
                <p className="text-gray-700">
                  当社は、本ポリシーを変更する場合があります。変更後のプライバシーポリシーは、
                  当社ウェブサイトに掲載した時点で効力を生じるものとします。
                  重要な変更については、サービス内での通知やメールでお知らせいたします。
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                  12. お問い合わせ窓口
                </h2>
                <div className="text-gray-700">
                  <p className="mb-3">
                    個人情報の取扱いに関するお問い合わせは、以下までご連絡ください：
                  </p>
                  <p>
                    株式会社RAYVEN
                    <br />
                    個人情報保護責任者：鈴山佳宏
                    <br />
                    メールアドレス：s.yoshihiro@rayven.cloud
                    <br />
                    電話番号：未掲載（お問い合わせはメールにて承ります）
                    <br />
                    住所：〒573-1157
                    大阪府枚方市片鉾本町２６－７サンエース片鉾ビル３１０
                  </p>
                </div>
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
