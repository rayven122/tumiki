<#import "template.ftl" as layout>
<#import "components/molecules/identity-provider-register.ftl" as identityProviderRegister>

<@layout.registrationLayout
  displayInfo=false
  displayMessage=!messagesPerField.existsError("firstName", "lastName", "email", "username", "password", "password-confirm")
  ;
  section
>
  <#if section="header">
    <#-- ヘッダーは空（ロゴはテンプレートで表示） -->
  <#elseif section="form">
    <#-- タイトルとサブタイトル -->
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.875rem; font-weight: 800; background: linear-gradient(to right, #4f46e5, #9333ea); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.75rem;">
        ${msg("welcomeNew")}
      </h1>
      <p style="font-size: 0.875rem; font-weight: 500; color: #4b5563;">
        ${msg("platformDescription")}
      </p>
    </div>
    <#-- ソーシャルログインボタン（新規登録用） -->
    <#if realm.password && social.providers??>
      <@identityProviderRegister.kw providers=social.providers />
    </#if>
    <#-- 区切り線（または） -->
    <div style="display: flex; align-items: center; margin-top: 1.5rem; margin-bottom: 1.5rem;">
      <div style="flex: 1; height: 2px; background: linear-gradient(to right, transparent, #e0e7ff);"></div>
      <span style="padding: 0 1rem; font-size: 0.875rem; font-weight: 500; color: #6b7280;">${msg("orDivider")}</span>
      <div style="flex: 1; height: 2px; background: linear-gradient(to left, transparent, #e0e7ff);"></div>
    </div>
    <#-- Email/Password登録フォーム -->
    <#if realm.password>
      <form action="${url.registrationAction}" method="post">
        <#-- Emailフィールド -->
        <div style="margin-bottom: 1rem;">
          <label for="email" style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
            ${msg("emailLabel")} <span style="color: #ef4444;">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            autofocus
            value="${(register.formData.email)!''}"
            style="width: 100%; padding: 0.75rem 1rem; border: 2px solid <#if messagesPerField.existsError('email')>#ef4444<#else>#000000</#if>; box-shadow: 4px 4px 0px 0px <#if messagesPerField.existsError('email')>#ef4444<#else>#000000</#if>; font-size: 1rem; outline: none; box-sizing: border-box;"
          />
          <#if messagesPerField.existsError("email")>
            <p style="margin-top: 0.5rem; font-size: 0.75rem; color: #ef4444;">${kcSanitize(messagesPerField.get("email"))?no_esc}</p>
          </#if>
        </div>
        <#-- Passwordフィールド -->
        <div style="margin-bottom: 1rem;">
          <label for="password" style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
            ${msg("passwordLabel")} <span style="color: #ef4444;">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            style="width: 100%; padding: 0.75rem 1rem; border: 2px solid <#if messagesPerField.existsError('password')>#ef4444<#else>#000000</#if>; box-shadow: 4px 4px 0px 0px <#if messagesPerField.existsError('password')>#ef4444<#else>#000000</#if>; font-size: 1rem; outline: none; box-sizing: border-box;"
          />
          <#if messagesPerField.existsError("password")>
            <p style="margin-top: 0.5rem; font-size: 0.75rem; color: #ef4444;">${kcSanitize(messagesPerField.get("password"))?no_esc}</p>
          </#if>
        </div>
        <#-- Password確認フィールド -->
        <div style="margin-bottom: 1.5rem;">
          <label for="password-confirm" style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
            ${msg("passwordConfirmLabel")} <span style="color: #ef4444;">*</span>
          </label>
          <input
            id="password-confirm"
            name="password-confirm"
            type="password"
            autocomplete="new-password"
            style="width: 100%; padding: 0.75rem 1rem; border: 2px solid <#if messagesPerField.existsError('password-confirm')>#ef4444<#else>#000000</#if>; box-shadow: 4px 4px 0px 0px <#if messagesPerField.existsError('password-confirm')>#ef4444<#else>#000000</#if>; font-size: 1rem; outline: none; box-sizing: border-box;"
          />
          <#if messagesPerField.existsError("password-confirm")>
            <p style="margin-top: 0.5rem; font-size: 0.75rem; color: #ef4444;">${kcSanitize(messagesPerField.get("password-confirm"))?no_esc}</p>
          </#if>
        </div>
        <#-- 登録ボタン -->
        <button
          type="submit"
          style="width: 100%; padding: 0.875rem 1.5rem; background: linear-gradient(to right, #4f46e5, #9333ea); border: 2px solid #000000; box-shadow: 4px 4px 0px 0px #000000; font-size: 1rem; font-weight: 700; color: #ffffff; cursor: pointer; transition: all 0.2s;"
          onmouseover="this.style.transform='translate(2px, 2px)'; this.style.boxShadow='2px 2px 0px 0px #000000';"
          onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='4px 4px 0px 0px #000000';"
        >
          ${msg("doRegister")}
        </button>
      </form>
    </#if>
    <#-- グラデーション区切り線 -->
    <div style="margin-top: 1.5rem; margin-bottom: 1.5rem; height: 2px; background: linear-gradient(to right, #e0e7ff, #f3e8ff, #e0e7ff);"></div>
    <#-- ログインリンク -->
    <div style="text-align: center; margin-bottom: 1rem;">
      <span style="font-size: 0.875rem; color: #6b7280;">${msg("alreadyHaveAccount")} </span>
      <a href="${url.loginUrl}" style="font-size: 0.875rem; font-weight: 600; color: #4f46e5; text-decoration: underline;">${msg("loginLink")}</a>
    </div>
    <#-- 利用規約 -->
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <p style="font-size: 0.75rem; color: #9ca3af; line-height: 1.5;">
        ${msg("termsNotice")}<a href="https://tumiki.cloud/terms" style="color: #6b7280; text-decoration: underline;">${msg("termsOfService")}</a>${msg("andText")}<a href="https://tumiki.cloud/privacy" style="color: #6b7280; text-decoration: underline;">${msg("privacyPolicy")}</a>${msg("agreeNotice")}
      </p>
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
    <#-- 情報セクションは非表示 -->
  <#elseif section="socialProviders">
    <#-- ソーシャルプロバイダーはformセクションで表示するため、ここでは非表示 -->
  </#if>
</@layout.registrationLayout>
