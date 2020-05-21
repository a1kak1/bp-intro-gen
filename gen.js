/**
 * @param {string} url
 * @param {boolean} isReadAsDataURL
 * @param {(data: string) => void} callback
 */
export function fetchExternalResource(url, isReadAsDataURL, callback) {
  if (isReadAsDataURL) {
    fetch(url).then(response => response.blob()).then(data => {
      const reader = new FileReader();
      reader.addEventListener('loadend', () => callback(reader.result));
      reader.readAsDataURL(data);
    });
  } else {
    fetch(url).then(response => response.text()).then(data => callback(data));
  }
}

let emitImageGeneration = () => {};
let emitOnImageGenerated = () => {};

function emitImageGenerationBy(el) {
  if (el.classList.contains('tab-focus')) {
    el.classList.remove('tab-focus');
    emitImageGeneration();
    el.classList.add('tab-focus');
  } else {
    emitImageGeneration();
  }
}

/**
 * @param {(dataURL: string) => void} listener
 */
export function onImageGenerated(listener) {
  emitOnImageGenerated = listener;
}

/**
 * @param {SVGSVGElement} generator
 */
export function enableImageGeneration(generator) {
  const { width, height } = generator.viewBox.baseVal;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const image = new Image();
  image.addEventListener('load', () => {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    emitOnImageGenerated(canvas.toDataURL());
  });

  emitImageGeneration = () => {
    const data = new XMLSerializer().serializeToString(generator);
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
  }
}

function addEnterClickTo(el) {
  el.addEventListener('keydown', ({ key }) => {
    if (key === 'Enter') {
      el.dispatchEvent(new MouseEvent('click'));
    }
  });
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

function addTabFocusTo(el) {
  el.addEventListener('focus', () => {
    if (isOnTabDown) {
      el.classList.add('tab-focus');
    }
  });
  el.addEventListener('blur', () => {
    el.classList.remove('tab-focus');
  });
}

const escapeSequenceMap = {
  '"': '&quot;',
  '&': '&amp;',
  "'": '&#039;',
  '<': '&lt;',
  '>': '&gt;',
  '`': '&#096;'
};

function escapeHTML(value) {
  return value.replace(/["&'<>`]/g, match => escapeSequenceMap[match]);
}

/**
 * @param {string} query
 */
export function enableUserInput(query) {
  for (const input of document.querySelectorAll(query)) {
    input.addEventListener('change', () => {
      input.setAttribute('value', escapeHTML(input.value));
      emitImageGenerationBy(input);
    });
    input.addEventListener('keydown', ({ key }) => {
      if (key === 'Enter') {
        input.blur();
      }
    });
    addTabFocusTo(input);
  }
}

/**
 * @param {string} query
 */
export function enableUserTextarea(query) {
  for (const textarea of document.querySelectorAll((query))) {
    textarea.addEventListener('change', () => {
      textarea.innerHTML = escapeHTML(textarea.value);
      emitImageGenerationBy(textarea);
    });
    addTabFocusTo(textarea);
  }
}

/**
 * @param {string} query
 * @param {string} appearanceQuery
 */
export function enableUserCheckbox(query, appearanceQuery) {
  const appearances = [ ...document.querySelectorAll(appearanceQuery) ];

  for (const checkbox of document.querySelectorAll(query)) {
    const appearance = appearances.find(el => el.dataset['tag'] === checkbox.dataset['tag']);

    checkbox.addEventListener('click', ev => {
      appearance.classList.toggle('checked');
      emitImageGenerationBy(checkbox);
      ev.preventDefault();
    });
    addEnterClickTo(checkbox);
    addTabFocusTo(checkbox);
  }
}

/**
 * @param {string} query
 * @param {string} appearanceQuery
 * @param {string} inputQuery
 */
export function enableUserCheckboxBoundToInput(query, appearanceQuery, inputQuery) {
  const appearances = [ ...document.querySelectorAll(appearanceQuery) ];
  const inputs = [ ...document.querySelectorAll(inputQuery) ];

  for (const checkbox of document.querySelectorAll(query)) {
    const appearance = appearances.find(el => el.dataset['tag'] === checkbox.dataset['tag']);
    const input = inputs.find(el => el.dataset['tag'] === checkbox.dataset['tag']);

    input.addEventListener('change', () => {
      input.dataset['cache'] = input.value;
    });
    input.addEventListener('input', () => {
      if (input.value === '') {
        appearance.classList.remove('checked');
      } else {
        appearance.classList.add('checked');
      }
    });

    checkbox.addEventListener('click', ev => {
      if (appearance.classList.toggle('checked')) {
        input.value = input.dataset['cache'] || '';
        input.focus();
      } else {
        input.dataset['cache'] = input.value;
        input.value = '';
      }
      input.setAttribute('value', input.value);
      emitImageGenerationBy(checkbox);
      ev.preventDefault();
    });
    addEnterClickTo(checkbox);
    addTabFocusTo(checkbox);
  }
}

/**
 * @param {string} query
 * @param {string} appearanceQuery
 */
export function enableUserRadiobutton(query, appearanceQuery) {
  const appearances = [ ...document.querySelectorAll(appearanceQuery) ];
  let radiobuttonGroupMap = {};
  for (const radiobutton of document.querySelectorAll(query)) {
    const appearance = appearances.find(el => el.dataset['tag'] === radiobutton.dataset['tag']);
    const groupName = radiobutton.dataset['group'];
    if (!radiobuttonGroupMap[groupName]) {
      radiobuttonGroupMap[groupName] = [];
    }
    radiobuttonGroupMap[groupName].push({ radiobutton, appearance });
  }

  for (const radiobuttonGroup of Object.values(radiobuttonGroupMap)) {
    for (const { radiobutton, appearance } of radiobuttonGroup) {
      radiobutton.addEventListener('click', ev => {
        for (const { appearance } of radiobuttonGroup) {
          appearance.classList.remove('checked');
        }
        appearance.classList.add('checked');
        emitImageGenerationBy(radiobutton);
        ev.preventDefault();
      });
      addEnterClickTo(radiobutton);
      addTabFocusTo(radiobutton);
    }
  }
}
