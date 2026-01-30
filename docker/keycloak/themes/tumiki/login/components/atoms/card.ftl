<#macro kw content="" footer="" header="">
  <div style="background-color: #ffffff; padding: 2rem; border: 2px solid #000000; box-shadow: 6px 6px 0px 0px #000000;">
    <#if header?has_content>
      <div style="margin-bottom: 1rem;">
        ${header}
      </div>
    </#if>
    <#if content?has_content>
      <div>
        ${content}
      </div>
    </#if>
    <#if footer?has_content>
      <div style="margin-top: 1rem;">
        ${footer}
      </div>
    </#if>
  </div>
</#macro>
