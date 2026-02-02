<#import "template.ftl" as layout>

<@layout.registrationLayout
  displayInfo=true
  displayMessage=!messagesPerField.existsError("username")
  ;
  section
>
  <#if section="header">
    <#-- ヘッダーは空（ロゴはテンプレートで表示） -->
  <#elseif section="form">
    <#-- タイトルとサブタイトル -->
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.5rem; font-weight: 800; background: linear-gradient(to right, #4f46e5, #9333ea); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.75rem;">
        ${msg("emailForgotTitle")}
      </h1>
      <p style="font-size: 0.875rem; font-weight: 500; color: #4b5563;">
        ${msg("resetPasswordDescription")}
      </p>
    </div>
    <#-- パスワードリセットフォーム -->
    <form action="${url.loginAction}" method="post">
      <#-- Email入力 -->
      <div style="margin-bottom: 1.5rem;">
        <label for="username" style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
          ${msg("emailLabel")}
        </label>
        <input
          id="username"
          name="username"
          type="email"
          autocomplete="${realm.loginWithEmailAllowed?string('email', 'username')}"
          autofocus
          value="${(auth?has_content && auth.showUsername())?then(auth.attemptedUsername, '')}"
          style="width: 100%; padding: 0.75rem 1rem; border: 2px solid <#if messagesPerField.existsError('username')>#ef4444<#else>#000000</#if>; box-shadow: 4px 4px 0px 0px <#if messagesPerField.existsError('username')>#ef4444<#else>#000000</#if>; font-size: 1rem; outline: none; box-sizing: border-box;"
        />
        <#if messagesPerField.existsError("username")>
          <p style="margin-top: 0.5rem; font-size: 0.75rem; color: #ef4444;">${kcSanitize(messagesPerField.get("username"))}</p>
        </#if>
      </div>
      <#-- 送信ボタン -->
      <button
        type="submit"
        class="neo-button"
      >
        ${msg("doSubmit")}
      </button>
    </form>
    <#-- ログインに戻るリンク -->
    <div style="text-align: center; margin-top: 1.5rem;">
      <a href="${url.loginUrl}" style="font-size: 0.875rem; color: #4f46e5; text-decoration: underline;">
        ${kcSanitize(msg("backToLogin"))}
      </a>
    </div>
  <#elseif section="info">
    <div style="text-align: center; padding: 1rem; background-color: #f0f9ff; border: 2px solid #0ea5e9; margin-top: 1rem;">
      <p style="font-size: 0.875rem; color: #0369a1;">
        ${msg("emailInstruction")}
      </p>
    </div>
  </#if>
</@layout.registrationLayout>
