<#import "template.ftl" as layout>
<#import "components/molecules/identity-provider.ftl" as identityProvider>

<@layout.registrationLayout
  displayInfo=false
  displayMessage=!messagesPerField.existsError("username", "password")
  ;
  section
>
  <#if section="header">
    <#-- ヘッダーは空（ロゴはテンプレートで表示） -->
  <#elseif section="form">
    <#assign hasSocialProviders = social.providers?? && social.providers?size gt 0>
    <#assign showLocalPasswordForm = realm.password && !hasSocialProviders>
    <div class="tumiki-auth-heading">
      <h1 class="tumiki-auth-title">
        ${msg("welcomeBack")}
      </h1>
      <p class="tumiki-auth-copy">
        ${msg("platformDescription")}
      </p>
    </div>
    <#-- ソーシャルログインボタン -->
    <#if hasSocialProviders>
      <@identityProvider.kw providers=social.providers labelKey="loginWithProvider" />
    </#if>
    <#-- Email/Passwordフォーム -->
    <#if showLocalPasswordForm>
      <form action="${url.loginAction}" method="post" onsubmit="login.disabled = true; return true;">
        <input
          name="credentialId"
          type="hidden"
          value="<#if auth.selectedCredential?has_content>${auth.selectedCredential}</#if>"
        >
        <#-- Emailフィールド -->
        <div class="tumiki-field">
          <label for="username" class="tumiki-label">
            ${msg("emailLabel")}
          </label>
          <input
            id="username"
            name="username"
            type="${realm.loginWithEmailAllowed?string('email', 'text')}"
            autocomplete="${realm.loginWithEmailAllowed?string('email', 'username')}"
            autofocus
            <#if usernameEditDisabled??>disabled</#if>
            value="${(login.username)!''}"
            class="tumiki-input<#if messagesPerField.existsError('username', 'password')> tumiki-input-error</#if>"
          />
        </div>
        <#-- Passwordフィールド -->
        <div class="tumiki-field">
          <label for="password" class="tumiki-label">
            ${msg("passwordLabel")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            class="tumiki-input<#if messagesPerField.existsError('username', 'password')> tumiki-input-error</#if>"
          />
        </div>
        <#-- エラーメッセージ -->
        <#if messagesPerField.existsError("username", "password")>
          <div class="tumiki-error-box">
            ${kcSanitize(messagesPerField.getFirstError("username", "password"))}
          </div>
        </#if>
        <#-- ログイン状態を保持 & パスワードを忘れた方 -->
        <div class="tumiki-form-row">
          <#if realm.rememberMe && !usernameEditDisabled??>
            <label class="tumiki-checkbox-label">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                <#if login.rememberMe??>checked</#if>
                class="tumiki-checkbox"
              />
              <span>${msg("rememberMe")}</span>
            </label>
          <#else>
            <div></div>
          </#if>
          <#if realm.resetPasswordAllowed>
            <a href="${url.loginResetCredentialsUrl}" class="tumiki-link">
              ${msg("forgotPassword")}
            </a>
          </#if>
        </div>
        <#-- ログインボタン -->
        <button
          id="login"
          name="login"
          type="submit"
          class="tumiki-button"
        >
          ${msg("doLogIn")}
        </button>
      </form>
    </#if>
    <#-- 区切り線 -->
    <#if realm.registrationAllowed>
      <div class="tumiki-divider"></div>
    </#if>
    <#-- 新規登録リンク -->
    <#if realm.registrationAllowed>
      <div class="tumiki-footer-link">
        <span class="tumiki-muted">${msg("noAccountYet")} </span>
        <a href="${url.registrationUrl}" class="tumiki-link">${msg("registerLink")}</a>
      </div>
    </#if>
    <#-- 言語切り替え -->
    <#if realm.internationalizationEnabled && locale.supported?size gt 1>
      <div class="tumiki-language-switch">
        <div class="tumiki-language-switch-inner">
          <#list locale.supported as l>
            <#if l.languageTag == locale.currentLanguageTag>
              <span class="tumiki-muted">${l.label}</span>
            <#else>
              <a href="${l.url}" class="tumiki-link">${l.label}</a>
            </#if>
          </#list>
        </div>
      </div>
    </#if>
  <#elseif section="info">
    <#-- 登録リンクは非表示 -->
  <#elseif section="socialProviders">
    <#-- ソーシャルプロバイダーはformセクションで表示するため、ここでは非表示 -->
  </#if>
</@layout.registrationLayout>
