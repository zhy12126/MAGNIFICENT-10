(()=>{
  const host=document.querySelector('[data-site-header]');
  if(!host)return;
  const page=host.dataset.page||'overview',isFx=page==='fx';
  const active=name=>name===page?' nav-active':'';
  const baseStyle='color:#59655f!important;text-decoration:none!important;font:500 13px/1 Manrope,\"Noto Sans SC\",Arial,sans-serif!important;';
  const activeStyle=`${baseStyle}color:#14201e!important;font-weight:600!important;border-bottom-color:#1aa774!important;`;
  const inactiveStyle=`${baseStyle}border-bottom-color:transparent!important;`;
  const disabledStyle=`${baseStyle}visibility:hidden!important;border-bottom-color:transparent!important;pointer-events:none!important;user-select:none!important;-webkit-user-select:none!important;`;
  const status=isFx
    ?'<span class="demo-dot"></span><span data-status-label>正在加载数据</span><span class="updated">更新时间（日本） <b data-updated>—</b></span>'
    :'<span class="live-dot"></span><span>美股日终估值</span><span class="updated">更新于 <b>等待日更数据</b></span>';
  host.innerHTML=`<a class="brand" href="index.html" aria-label="返回主页"><span class="brand-mark">H</span><span>HY的工具小站</span></a><nav aria-label="主要功能"><a class="site-nav-link${active('overview')}" style="${page==='overview'?activeStyle:inactiveStyle}" href="index.html"${page==='overview'?' aria-current="page"':''}>巨头估值</a><span class="site-nav-link nav-coming" style="${disabledStyle}width:52px!important;flex:none!important" aria-hidden="true"></span><a class="site-nav-link${active('fx')}" style="${isFx?activeStyle:inactiveStyle}" href="feature.html?v=20260802-05"${isFx?' aria-current="page"':''}>人民币/日元汇率分析</a></nav><div class="header-right">${status}</div>`;
})();
