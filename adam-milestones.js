
  function getProgress(){const api=window.GEI_PROGRESS;if(!api||typeof api.getState!=="function")return{completed:[],xp:0,currentDay:1};const s=api.getState()||{},completed=Array.isArray(s.completed)?[...new Set(s.completed.map(Number).filter(id=>id>=1&&id<=6))].sort((a,b)=>a-b):[];return{completed,xp:Math.max(0,Number(s.xp)||0),currentDay:Number(api.getCurrentDay?.())||1}}
  function getMilestone(){const p=getProgress(),count=p.completed.length;return{...MILESTONES[count],count,currentDay:count<6?p.currentDay:6}}
  function refreshAssistant(){const a=document.getElementById("home-adam-assistant");if(!a)return;const m=getMilestone(),l=a.querySelector(".home-adam-assistant-next-label"),msg=a.querySelector("#home-adam-assistant-message"),n=a.querySelector(".home-adam-assistant-next-value");if(l)l.textContent=m.label;if(msg)msg.textContent=m.message;if(n)n.textContent=`DAY ${m.currentDay} • ${m.count}/6`;a.dataset.adamMilestone=m.count}
  function loadChildScript(src,marker,onload){if(document.querySelector(`script[data-gei-${marker}]`))return;const s=document.createElement("script");s.src=src;s.async=false;s.dataset[`gei${marker.charAt(0).toUpperCase()}${marker.slice(1)}`]=marker;if(typeof onload==="function")s.addEventListener("load",onload,{once:true});document.head.appendChild(s)}
  /* V2.0.3 FIX — the marker may contain hyphens ("mastery-milestones", "v132-celebration",
     "v134-rewards"). Building a dataset key from it produced names like
     dataset["geiMastery-milestones"], and a hyphen is illegal in a DOMStringMap property
     name, so the setter threw SyntaxError. That throw aborted the rest of init(), so
     adam-mastery-milestones.js, adam-mastery-celebration.js and adam-reward-unlock.js were
     never injected. setAttribute writes the exact attribute the guard above matches, so the
     marker is honoured verbatim and the de-duplication keeps working. */
  function loadChildScript(src,marker,onload){if(document.querySelector(`script[data-gei-${marker}]`))return;const s=document.createElement("script");s.src=src;s.async=false;s.setAttribute(`data-gei-${marker}`,marker);if(typeof onload==="function")s.addEventListener("load",onload,{once:true});document.head.appendChild(s)}
  function loadAcademyFixStyles(){if(document.querySelector('link[href="v1-26-academy-fix.css"]'))return;const l=document.createElement("link");l.rel="stylesheet";l.href="v1-26-academy-fix.css";document.head.appendChild(l)}
  function loadCelebration(){if(!document.querySelector('link[data-gei-v132-celebration]')){const l=document.createElement("link");l.rel="stylesheet";l.href="adam-mastery-celebration.css";l.dataset.geiV132Celebration="true";document.head.appendChild(l)}loadChildScript("adam-mastery-celebration.js","v132-celebration",null)}
  function loadRewards(){if(!document.querySelector('link[data-gei-v134-rewards]')){const l=document.createElement("link");l.rel="stylesheet";l.href="adam-reward-unlock.css";l.dataset.geiV134Rewards="true";document.head.appendChild(l)}loadChildScript("adam-reward-unlock.js","v134-rewards",null)}
