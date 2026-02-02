<#import "/assets/providers/providers.ftl" as providerIcons>

<#macro kw providers=[]>
  <div style="margin-top: 0.5rem;">
    <#list providers as provider>
      <a
        data-provider="${provider.alias}"
        href="${provider.loginUrl}"
        style="display: flex; width: 100%; align-items: center; justify-content: space-between; overflow: hidden; border: 2px solid #000000; background-color: #ffffff; padding: 1rem 1.5rem; font-weight: 700; color: #1f2937; box-shadow: 4px 4px 0px 0px #000000; text-decoration: none; transition: all 0.2s; box-sizing: border-box;"
        onmouseover="this.style.transform='translate(2px, 2px)'; this.style.boxShadow='2px 2px 0px 0px #000000';"
        onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='4px 4px 0px 0px #000000';"
      >
        <div style="display: flex; align-items: center; gap: 1rem;">
          <#if providerIcons[provider.alias]??>
            <div style="display: flex; width: 40px; height: 40px; align-items: center; justify-content: center; border: 2px solid #000000; background-color: #ffffff;">
              <div style="width: 24px; height: 24px;">
                <@providerIcons[provider.alias] />
              </div>
            </div>
          </#if>
          <span style="font-size: 1.125rem;">
            ${msg("loginWithGoogle")}
          </span>
        </div>
        <svg style="width: 24px; height: 24px; color: #6366f1;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
        </svg>
      </a>
    </#list>
  </div>
</#macro>
