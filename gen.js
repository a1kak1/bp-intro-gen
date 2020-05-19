'use strict';

const generator = document.getElementById('gen-root');
const { width, height } = generator.viewBox.baseVal;
const result = document.getElementById('result');

const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');

const image = new Image();
image.addEventListener('load', () => {
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  result.src = canvas.toDataURL();
});

function emitConversion() {
  const url = new XMLSerializer().serializeToString(generator);
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(url);
}

{
  const xhr = new XMLHttpRequest();
  xhr.open('GET', './bp_introduction.png');
  xhr.responseType = 'blob';
  xhr.addEventListener('load', () => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      document.getElementById('template-base').setAttribute('src', reader.result);
    });
    reader.readAsDataURL(xhr.response);
  });
  xhr.send();
}

{
  const xhr = new XMLHttpRequest();
  xhr.open('GET', './gen.css');
  xhr.addEventListener('load', () => {
    document.getElementById('gen-style').innerHTML = xhr.response;
  });
  xhr.send();
}

{
  for (const input of document.getElementsByClassName('user-input')) {
    input.addEventListener('change', () => {
      input.setAttribute('value', input.value);
      emitConversion();
    });
    input.addEventListener('keydown', ({ key }) => {
      if (key === 'Enter') {
        input.blur();
      }
    });
  }

  for (const textarea of document.getElementsByClassName('user-textarea')) {
    textarea.addEventListener('change', () => {
      textarea.innerHTML = textarea.value.replace(/[&'`"<>]/g, match => {
        return {
          '&': '&amp;',
          '\'': '&#x27;',
          '`': '&#x60;',
          '"': '&quot;',
          '<': '&lt;',
          '>': '&gt;'
        }[match];
      });
      emitConversion();
    });
  }
}

let isOnTabDown = false;
document.addEventListener('keydown', ({ key }) => {
  if (key === 'Tab') {
    isOnTabDown = true;
  }
});
document.addEventListener('keyup', ({ key }) => {
  if (key === 'Tab') {
    isOnTabDown = false;
  }
});

{
  const checkboxAppearances = [ ...document.getElementsByClassName('checkbox-appearance') ];
  const classLevels = [ ...document.querySelectorAll('.class .user-input') ];

  for (const checkbox of document.getElementsByClassName('user-checkbox')) {
    const appearance = checkboxAppearances.find(el => checkbox.dataset['tag'] === el.dataset['tag']);

    if (checkbox.classList.contains('of-class')) {
      const level = classLevels.find(el => checkbox.dataset['tag'] === el.dataset['tag']);

      level.addEventListener('change', () => {
        level.dataset['cache'] = level.value;
      });
      level.addEventListener('input', () => {
        if (level.value === '') {
          appearance.classList.remove('checked');
        } else {
          appearance.classList.add('checked');
        }
      });

      checkbox.addEventListener('click', ev => {
        if (appearance.classList.toggle('checked')) {
          level.value = level.dataset['cache'] || '';
          level.focus();
        } else {
          level.dataset['cache'] = level.value;
          level.value = '';
        }
        level.setAttribute('value', level.value);

        if (checkbox.classList.contains('tab-focus')) {
          checkbox.classList.remove('tab-focus');
          emitConversion();
          checkbox.classList.add('tab-focus');
        } else {
          emitConversion();
        }
        ev.preventDefault();
      });
    } else {
      checkbox.addEventListener('click', ev => {
        appearance.classList.toggle('checked');

        if (checkbox.classList.contains('tab-focus')) {
          checkbox.classList.remove('tab-focus');
          emitConversion();
          checkbox.classList.add('tab-focus');
        } else {
          emitConversion();
        }
        ev.preventDefault();
      });
    }
    checkbox.addEventListener('keydown', ({ key }) => {
      if (key === 'Enter') {
        checkbox.dispatchEvent(new Event('click'));
      }
    });
    checkbox.addEventListener('focus', () => {
      if(isOnTabDown) {
        checkbox.classList.add('tab-focus');
      }
    });
    checkbox.addEventListener('blur', () => {
      checkbox.classList.remove('tab-focus');
    });
  }
}

{
  const radiobuttonAppearances = [ ...document.getElementsByClassName('radiobutton-appearance') ];
  let radiobuttonGroups = {};
  for (const radiobutton of document.getElementsByClassName('user-radiobutton')) {
    const appearance = radiobuttonAppearances.find(el => radiobutton.dataset['tag'] === el.dataset['tag']);
    radiobuttonGroups[radiobutton.dataset['group']] = [ ...(radiobuttonGroups[radiobutton.dataset['group']] || []), { radiobutton, appearance } ];
  }

  for (const radiobuttonGroup of Object.values(radiobuttonGroups)) {
    radiobuttonGroup.forEach(({ radiobutton, appearance }, _, group) => {
      radiobutton.addEventListener('click', ev => {
        for (const { appearance } of group) {
          appearance.classList.remove('checked');
        }
        appearance.classList.add('checked');

        if (radiobutton.classList.contains('tab-focus')) {
          radiobutton.classList.remove('tab-focus');
          emitConversion();
          radiobutton.classList.add('tab-focus');
        } else {
          emitConversion();
        }
        ev.preventDefault();
      });
      radiobutton.addEventListener('keydown', ({ key }) => {
        if (key === 'Enter') {
          radiobutton.dispatchEvent(new Event('click'));
        }
      });
      radiobutton.addEventListener('focus', () => {
        if (isOnTabDown) {
          radiobutton.classList.add('tab-focus');
        }
      });
      radiobutton.addEventListener('blur', () => {
        radiobutton.classList.remove('tab-focus');
      });
    });
  }
}
