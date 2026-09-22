
   '<label class="gei-video-input-card"><span class="gei-video-input-number">02</span><strong>WHAT QUESTION DID IT RAISE?</strong><small>Write a question you want to investigate further.</small><textarea id="gei-video-question" rows="4" maxlength="1200" placeholder="I want to know…"></textarea><span class="gei-video-count" data-count-for="question">0 / 1200</span></label>'+
  '</div>'+
  '<div class="gei-video-intelligence-footer"><span class="gei-video-save-status" role="status" aria-live="polite">NOTES READY</span><button class="gei-video-save" id="gei-video-save" type="button">SAVE MY NOTES</button><a href="day-1.html" class="gei-video-continue">CONTINUE TO DAY 1 →</a></div>';
 root.insertBefore(section,connection);
 connection.parentNode.insertBefore(section,connection);
 const observation=section.querySelector("#gei-video-observation");
 const question=section.querySelector("#gei-video-question");
 const status=section.querySelector(".gei-video-save-status");
