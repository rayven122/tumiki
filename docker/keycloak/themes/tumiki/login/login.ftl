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
    <#-- タイトルとサブタイトル -->
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.875rem; font-weight: 800; background: linear-gradient(to right, #4f46e5, #9333ea); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.75rem;">
        ${msg("welcomeBack")}
      </h1>
      <p style="font-size: 0.875rem; font-weight: 500; color: #4b5563;">
        ${msg("platformDescription")}
      </p>
    </div>
    <#-- ソーシャルログインボタン -->
    <#if realm.password && social.providers??>
      <@identityProvider.kw providers=social.providers />
    </#if>
    <#-- 区切り線（または） -->
    <div style="display: flex; align-items: center; margin-top: 1.5rem; margin-bottom: 1.5rem;">
      <div style="flex: 1; height: 2px; background: linear-gradient(to right, transparent, #e0e7ff);"></div>
      <span style="padding: 0 1rem; font-size: 0.875rem; font-weight: 500; color: #6b7280;">${msg("orDivider")}</span>
      <div style="flex: 1; height: 2px; background: linear-gradient(to left, transparent, #e0e7ff);"></div>
    </div>
    <#-- Email/Passwordフォーム -->
    <#if realm.password>
      <form action="${url.loginAction}" method="post" onsubmit="login.disabled = true; return true;">
        <input
          name="credentialId"
          type="hidden"
          value="<#if auth.selectedCredential?has_content>${auth.selectedCredential}</#if>"
        >
        <#-- Emailフィールド -->
        <div style="margin-bottom: 1rem;">
          <label for="username" style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
            ${msg("emailLabel")}
          </label>
          <input
            id="username"
            name="username"
            type="email"
            autocomplete="${realm.loginWithEmailAllowed?string('email', 'username')}"
            autofocus
            <#if usernameEditDisabled??>disabled</#if>
            value="${(login.username)!''}"
            style="width: 100%; padding: 0.75rem 1rem; border: 2px solid <#if messagesPerField.existsError('username', 'password')>#ef4444<#else>#000000</#if>; box-shadow: 4px 4px 0px 0px <#if messagesPerField.existsError('username', 'password')>#ef4444<#else>#000000</#if>; font-size: 1rem; outline: none; box-sizing: border-box;"
          />
        </div>
        <#-- Passwordフィールド -->
        <div style="margin-bottom: 1rem;">
          <label for="password" style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
            ${msg("passwordLabel")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            style="width: 100%; padding: 0.75rem 1rem; border: 2px solid <#if messagesPerField.existsError('username', 'password')>#ef4444<#else>#000000</#if>; box-shadow: 4px 4px 0px 0px <#if messagesPerField.existsError('username', 'password')>#ef4444<#else>#000000</#if>; font-size: 1rem; outline: none; box-sizing: border-box;"
          />
        </div>
        <#-- エラーメッセージ -->
        <#if messagesPerField.existsError("username", "password")>
          <div style="margin-bottom: 1rem; padding: 0.75rem; background-color: #fef2f2; border: 2px solid #ef4444; color: #dc2626; font-size: 0.875rem;">
            ${kcSanitize(messagesPerField.getFirstError("username", "password"))}
          </div>
        </#if>
        <#-- ログイン状態を保持 & パスワードを忘れた方 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <#if realm.rememberMe && !usernameEditDisabled??>
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                <#if login.rememberMe??>checked</#if>
                style="width: 1.25rem; height: 1.25rem; border: 2px solid #000000; margin-right: 0.5rem; cursor: pointer;"
              />
              <span style="font-size: 0.875rem; color: #374151;">${msg("rememberMe")}</span>
            </label>
          <#else>
            <div></div>
          </#if>
          <#if realm.resetPasswordAllowed>
            <a href="${url.loginResetCredentialsUrl}" style="font-size: 0.875rem; color: #4f46e5; text-decoration: underline;">
              ${msg("forgotPassword")}
            </a>
          </#if>
        </div>
        <#-- ログインボタン -->
        <button
          id="login"
          name="login"
          type="submit"
          class="neo-button"
        >
          ${msg("doLogIn")}
        </button>
      </form>
    </#if>
    <#-- グラデーション区切り線 -->
    <div style="margin-top: 1.5rem; margin-bottom: 1.5rem; height: 2px; background: linear-gradient(to right, #e0e7ff, #f3e8ff, #e0e7ff);"></div>
    <#-- 新規登録リンク -->
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <span style="font-size: 0.875rem; color: #6b7280;">${msg("noAccountYet")} </span>
      <a href="${url.registrationUrl}" style="font-size: 0.875rem; font-weight: 600; color: #4f46e5; text-decoration: underline;">${msg("registerLink")}</a>
    </div>
    <#-- 言語切り替え -->
    <#if realm.internationalizationEnabled && locale.supported?size gt 1>
      <div style="text-align: center; margin-top: 1rem;">
        <div style="display: flex; justify-content: center; gap: 1rem;">
          <#list locale.supported as l>
            <#if l.languageTag == locale.currentLanguageTag>
              <span style="font-size: 0.875rem; color: #6b7280;">${l.label}</span>
            <#else>
              <a href="${l.url}" style="font-size: 0.875rem; font-weight: 600; color: #4f46e5; text-decoration: none;">${l.label}</a>
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
