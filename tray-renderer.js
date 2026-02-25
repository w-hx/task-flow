(function() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const w = 520;
  const h = 72;

  const TASK_NAME_MAX_WIDTH = 400;
  const SEPARATOR_X = 350;

  function renderTrayImage(taskNamePart, timePart) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.font = '22px -apple-system, "PingFang SC", "Helvetica Neue", sans-serif';
    ctx.textBaseline = 'middle';

    const y = h / 2;

    if (taskNamePart) {
      ctx.fillText(taskNamePart, 8, y, TASK_NAME_MAX_WIDTH);
    }
    if (timePart) {
      ctx.fillText(' - ' + timePart, SEPARATOR_X, y);
    }


    const dataUrl = canvas.toDataURL('image/png');
    if (window.trayAPI) window.trayAPI.sendImage(dataUrl);
  }

  if (window.trayAPI) {
    window.trayAPI.onRenderRequest((data) => {
      renderTrayImage(
        data.taskNamePart || '',
        data.timePart || '',
      );
    });
  }
})();
