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
    <div class="tumiki-auth-heading">
      <h1 class="tumiki-auth-title">
        ${msg("emailForgotTitle")}
      </h1>
      <p class="tumiki-auth-copy">
        ${msg("resetPasswordDescription")}
      </p>
    </div>
    <#-- パスワードリセットフォーム -->
    <form action="${url.loginAction}" method="post">
      <#-- Email入力 -->
      <div class="tumiki-field tumiki-field-large">
        <label for="username" class="tumiki-label">
          ${msg("emailLabel")}
        </label>
        <input
          id="username"
          name="username"
          type="email"
          autocomplete="email"
          autofocus
          value="${(auth?has_content && auth.showUsername())?then(auth.attemptedUsername, '')}"
          class="tumiki-input<#if messagesPerField.existsError('username')> tumiki-input-error</#if>"
        />
        <#if messagesPerField.existsError("username")>
          <p class="tumiki-error">${kcSanitize(messagesPerField.get("username"))}</p>
        </#if>
      </div>
      <#-- 送信ボタン -->
      <button
        type="submit"
        class="tumiki-button"
      >
        ${msg("doSubmit")}
      </button>
    </form>
    <#-- ログインに戻るリンク -->
    <div class="tumiki-footer-link">
      <a href="${url.loginUrl}" class="tumiki-link">
        ${msg("backToLogin")}
      </a>
    </div>
  <#elseif section="info">
    <div class="tumiki-info-box">
      <p class="tumiki-info-text">
        ${msg("emailInstruction")}
      </p>
    </div>
  </#if>
</@layout.registrationLayout>
