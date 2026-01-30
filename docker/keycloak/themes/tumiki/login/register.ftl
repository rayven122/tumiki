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
        <br />
        <span style="color: #4f46e5;">${msg("startWithGooglePrompt")}</span>
      </p>
    </div>
    <#-- ソーシャルログインボタン（新規登録用） -->
    <#if realm.password && social.providers??>
      <@identityProviderRegister.kw providers=social.providers />
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
