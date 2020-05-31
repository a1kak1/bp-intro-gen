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

let isOnMouseLeftDown = false;
const MOUSE_LEFT = 0;
document.addEventListener('mousedown', ({ button }) => {
  if (button === MOUSE_LEFT) {
    isOnMouseLeftDown = true;
  }
}, true);
document.addEventListener('mouseup', ({ button }) => {
  if (button === MOUSE_LEFT) {
    isOnMouseLeftDown = false;
  }
}, true);

let isOnTabDown = false;
document.addEventListener('keydown', ({ key }) => {
  if (key === 'Tab') {
    isOnTabDown = true;
  }
}, true);
document.addEventListener('keyup', ({ key }) => {
  if (key === 'Tab') {
    isOnTabDown = false;
  }
}, true);

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

class ImageFilter {
  constructor(image, onFiltered = () => {}) {
    this.image = image;
    this.onFiltered = onFiltered;
    this.filters = {
      brightness: {
        name: '明るさ',
        type: 'brightness',
        unit: '%',
        default: 100,
        min: 75,
        max: 175,
        delta: 25
      },
      contrast: {
        name: 'コントラスト',
        type: 'contrast',
        unit: '%',
        default: 100,
        min: 75,
        max: 175,
        delta: 25
      },
      grayscale: {
        name: 'グレースケール',
        type: 'grayscale',
        unit: '%',
        default: 0,
        min: 0,
        max: 100,
        delta: 25
      },
      saturation: {
        name: '彩度',
        type: 'saturate',
        unit: '%',
        default: 100,
        min: 75,
        max: 175,
        delta: 25
      },
      sepia: {
        name: 'セピア',
        type: 'sepia',
        unit: '%',
        default: 0,
        min: 0,
        max: 100,
        delta: 25
      },
      hueRotation: {
        name: '色相反転',
        type: 'hue-rotate',
        unit: 'deg',
        default: 0,
        min: 0,
        max: 315,
        delta: 45
      },
      inversion: {
        name: '階調反転',
        type: 'invert',
        unit: '%',
        default: 0,
        min: 0,
        max: 100,
        delta: 25,
        rotate() {
          this.level = (this.level > 50 ? this.level : 50) + this.delta;
        }
      },
      blur: {
        name: 'ぼかし',
        type: 'blur',
        unit: 'px',
        default: 0,
        min: 0,
        max: 2,
        delta: 1
      }
    };
  }

  rotate(filterId) {
    const filter = this.filters[filterId];
    filter.isRotated = true;
    if (!filter.level) {
      filter.level = filter.default;
    }
    if (filter.rotate) {
      filter.rotate();
    } else {
      filter.level += filter.delta;
    }
    if (filter.level > filter.max) {
      filter.level = filter.min;
    }
    if (filter.level === filter.default) {
      filter.isRotated = false;
    }
    this.render();
  }

  render() {
    let value = '';
    for (const filter of Object.values(this.filters)) {
      if (filter.isRotated) {
        value += `${filter.type}(${filter.level}${filter.unit}) `;
      }
    }
    this.image.style.setProperty('filter', value);
    this.onFiltered(this.filters);
  }

  clear() {
    for (const filter of Object.values(this.filters)) {
      filter.level = filter.default;
      filter.isRotated = false;
    }
    this.image.style.setProperty('filter', '');
    this.onFiltered(this.filters);
  }

  brightness() {
    this.rotate('brightness');
  }

  contrast() {
    this.rotate('contrast');
  }

  grayscale() {
    this.rotate('grayscale');
  }

  saturation() {
    this.rotate('saturation');
  }

  sepia() {
    this.rotate('sepia');
  }

  hueRotation() {
    this.rotate('hueRotation');
  }

  inversion() {
    this.rotate('inversion');
  }

  blur() {
    this.rotate('blur');
  }
}

class AvatarImage {
  static scaleMin = 1;
  static scaleMax = 10;
  static scaleDelta = 0.5;

  isLoaded = false;
  isOnDrag = false;

  constructor(avatar, image, onScaled = () => {}, onFiltered = () => {}) {
    this.avatar = avatar;
    this.image = image;
    this.onScaled = onScaled;
    this.onFiltered = onFiltered;

    this.image.addEventListener('load', () => {
      this.isLoaded = true;
      this.baseSize = {
        width: this.avatar.offsetWidth,
        height: this.avatar.offsetHeight
      };
      this.scaleRate = AvatarImage.scaleMin;
      this.filter = new ImageFilter(this.image, this.onFiltered);
      this.isLandscape = this.image.width > this.image.height;

      this.alignInitial();
      this.image.style.setProperty('visibility', 'visible');
      this.avatar.classList.add('loaded');
    });

    this.image.addEventListener('mousedown', () => {
      if (isOnMouseLeftDown) {
        this.isOnDrag = true;
      }
    });
    document.addEventListener('mousemove', ev => {
      if (this.isOnDrag) {
        const style = window.getComputedStyle(document.documentElement);
        const zoom = style.getPropertyValue('zoom') * style.getPropertyValue('--ratio');
        this.move(ev.movementX / zoom, ev.movementY / zoom);
      }
    });
    document.addEventListener('mouseup', () => {
      this.isOnDrag = false;
    });

    this.image.addEventListener('wheel', ev => {
      const zoom = window.getComputedStyle(document.documentElement).getPropertyValue('zoom');
      this.scale(ev.deltaY, ev.offsetX * zoom, ev.offsetY * zoom);
      ev.preventDefault();
    });
  }

  load(file) {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      this.image.style.setProperty('visibility', 'hidden');
      this.image.src = reader.result;
    });
    reader.readAsDataURL(file);
  }

  alignInitial() {
    if (this.isLandscape) {
      this.image.style.setProperty('width', 'auto');
      this.image.style.setProperty('height', '100%');
      this.image.style.setProperty('left', `calc(50% - ${this.image.width / 2}px)`);
      this.image.style.setProperty('top', `0`);
    } else {
      this.image.style.setProperty('width', '100%');
      this.image.style.setProperty('height', 'auto');
      this.image.style.setProperty('left', `0`);
      this.image.style.setProperty('top', `calc(50% - ${this.image.height / 2}px)`);
    }
    this.scaleRate = AvatarImage.scaleMin;
    this.onScaled(this.scaleRate);
  }

  move(dx, dy) {
    this.image.style.setProperty('left', clamp(this.image.offsetLeft + dx, this.baseSize.width - this.image.width, 0) + 'px');
    this.image.style.setProperty('top', clamp(this.image.offsetTop + dy, this.baseSize.height - this.image.height, 0) + 'px');
  }

  scale(compareVal, originX, originY) {
    if (!this.isScalable(compareVal)) {
      return;
    }

    const origin = {
      x: originX,
      y: originY
    };
    origin.ratioX = origin.x / this.image.width;
    origin.ratioY = origin.y / this.image.height;

    const isToZoomIn = compareVal <= 0;
    const delta = AvatarImage.scaleDelta * (this.scaleRate < 2 || this.scaleRate < 2 + AvatarImage.scaleDelta && !isToZoomIn ? 0.5 : 1);
    this.scaleRate = clamp(this.scaleRate + delta * (isToZoomIn ? 1 : -1), AvatarImage.scaleMin, AvatarImage.scaleMax);
    if (this.isLandscape) {
      this.image.style.setProperty('height', 100 * this.scaleRate + '%');
    } else {
      this.image.style.setProperty('width', 100 * this.scaleRate + '%');
    }

    const dx = this.image.width * origin.ratioX - origin.x;
    const dy = this.image.height * origin.ratioY - origin.y;
    this.move(dx * -1, dy * -1);

    this.onScaled(this.scaleRate);
  }

  zoomIn() {
    this.scale(-1, this.centerOffsetX(), this.centerOffsetY());
  }

  zoomOut() {
    this.scale(1, this.centerOffsetX(), this.centerOffsetY());
  }

  isScalable(compareVal) {
    const isToZoomIn = compareVal <= 0;
    if (this.scaleRate >= AvatarImage.scaleMax && isToZoomIn) {
      return false;
    }
    if (this.scaleRate <= AvatarImage.scaleMin && !isToZoomIn) {
      return false;
    }
    return true;
  }

  centerOffsetX() {
    return this.baseSize.width / 2 - this.image.offsetLeft;
  }

  centerOffsetY() {
    return this.baseSize.height / 2 - this.image.offsetTop;
  }
}

/**
 * @param {string} query
 * @param {string} imageQuery
 * @param {string} scaleInfoQuery
 * @param {string} filterInfoQuery
 */
export function enableUserAvatar(query, imageQuery, scaleInfoQuery, filterInfoQuery) {
  const avatar = document.querySelector(query);
  const image = document.querySelector(imageQuery);
  const scaleInfo = document.querySelector(scaleInfoQuery);
  const filterInfo = document.querySelector(filterInfoQuery);
  const arrowKeyDown = {
    'ArrowLeft': 0,
    'ArrowRight': 0,
    'ArrowUp': 0,
    'ArrowDown': 0
  };

  const onScaled = scale => {
    scaleInfo.innerHTML = scale === AvatarImage.scaleMin ? '' : `ズーム ${100 * scale}%`;
  };
  const onFiltered = filters => {
    let value = '';
    for (const filter of Object.values(filters)) {
      if (filter.isRotated) {
        value += `${filter.name} ${filter.level}${filter.unit}<br />`;
      }
    }
    filterInfo.innerHTML = value;
  };

  const avatarImage = new AvatarImage(avatar, image, onScaled, onFiltered);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept ='image/*';

  avatar.addEventListener('blur', () => {
    emitImageGenerationBy(avatar);
  });

  avatar.addEventListener('click', () => {
    if (!avatar.classList.contains('loaded')) {
      avatar.dispatchEvent(new MouseEvent('dblclick'));
    }
  });
  avatar.addEventListener('dblclick', () => {
    fileInput.click();

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        avatarImage.load(fileInput.files[0]);
      }
    });
  });

  avatar.addEventListener('dragover', ev => {
    ev.preventDefault();
  });
  avatar.addEventListener('drop', ev => {
    for (const file of ev.dataTransfer.files) {
      if (file.type.startsWith('image/')) {
        avatarImage.load(file);
        break;
      }
    }
    ev.preventDefault();
  });
  document.addEventListener('dragover', ev => {
    ev.preventDefault();
  });
  document.addEventListener('drop', ev => {
    ev.preventDefault();
  });

  avatar.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') {
      avatar.dispatchEvent(new MouseEvent('dblclick'));
    }
    if (!avatarImage.isLoaded) {
      return;
    }
    switch (ev.key) {
      case 'B':
        // fallthrough
      case 'b':
        avatarImage.filter.brightness();
        break;
      case 'C':
        // fallthrough
      case 'c':
        avatarImage.filter.contrast();
        break;
      case 'G':
        // fallthrough
      case 'g':
        avatarImage.filter.grayscale();
        break;
      case 'S':
        // fallthrough
      case 's':
        avatarImage.filter.saturation();
        break;
      case 'P':
        // fallthrough
      case 'p':
        avatarImage.filter.sepia();
        break;
      case 'H':
        // fallthrough
      case 'h':
        avatarImage.filter.hueRotation();
        break;
      case 'I':
        // fallthrough
      case 'i':
        avatarImage.filter.inversion();
        break;
      case 'L':
        // fallthrough
      case 'l':
        avatarImage.filter.blur();
        break;
      case 'X':
        // fallthrough
      case 'x':
        avatarImage.filter.clear();
        break;
      case ';': // same key as '+' on JIS Keyboard
        // US配列では':'と対になるので、US配列キーボードでの入力時は弾きたいが区別不能
        // fallthrough
      case '+':
        avatarImage.zoomIn();
        ev.preventDefault();
        break;
      case '_': // '-' with 'Shift' on US Keyboard
        if (!ev.getModifierState('Shift')) {
          break;
        }
        // fallthrough
      case '-':
        avatarImage.zoomOut();
        ev.preventDefault();
        break;
      case '=': // '-' with 'Shift' on JIS Keyboard or same key as '+' on US Keyboard
        ev.getModifierState('Shift') ? avatarImage.zoomOut() : avatarImage.zoomIn();
        ev.preventDefault();
        break;
      case '0':
        avatarImage.alignInitial();
        break;
    }
    if (ev.key.startsWith('Arrow')) {
      arrowKeyDown[ev.key] = 1;
      const delta = 10;
      const dx = (arrowKeyDown['ArrowLeft'] - arrowKeyDown['ArrowRight']) * delta;
      const dy = (arrowKeyDown['ArrowUp'] - arrowKeyDown['ArrowDown']) * delta;
      avatarImage.move(dx, dy);
    }
  });

  avatar.addEventListener('keyup', ({ key }) => {
    if (key.startsWith('Arrow')) {
      arrowKeyDown[key] = 0;
    }
  })

  addTabFocusTo(avatar);
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

const arrowOffsetMap = {
  'ArrowLeft': -1,
  'ArrowRight': 1
};

function renderSlider(slider, scales, appearance) {
  const scale = scales.find(el => el.dataset['value'] === slider.dataset['value']);
  appearance.style.setProperty('left', scale.dataset['offset']);
  appearance.style.setProperty('width', appearance.dataset['basicWidth']);
  emitImageGenerationBy(slider);
}

/**
 * @param {string} query
 * @param {string} scaleQuery
 * @param {string} appearanceQuery
 */
export function enableUserSlider(query, scaleQuery, appearanceQuery) {
  let sliderGroupMap = {};
  for (const slider of document.querySelectorAll(query)) {
    sliderGroupMap[slider.dataset['group']] = {
      slider,
      scales: []
    };
  }
  for (const scale of document.querySelectorAll(scaleQuery)) {
    sliderGroupMap[scale.dataset['group']].scales.push(scale);
  }
  for (const appearance of document.querySelectorAll(appearanceQuery)) {
    sliderGroupMap[appearance.dataset['group']].appearance = appearance;
  }

  for (const { slider, scales, appearance } of Object.values(sliderGroupMap)) {
    slider.addEventListener('mousedown', ev => {
      if (!isOnMouseLeftDown) {
        return;
      }
      const scale = ev.target;
      slider.dataset['value'] = scale.dataset['value'];
      renderSlider(slider, scales, appearance);
    });
    slider.addEventListener('keydown', ({ key }) => {
      if (key !== 'ArrowLeft' && key !== 'ArrowRight') {
        return;
      }
      if (!slider.dataset['value']) {
        slider.dataset['value'] = scales.length - 1 >> 1;
      } else {
        const value = Number(slider.dataset['value']) + arrowOffsetMap[key];
        slider.dataset['value'] = clamp(value, 0, scales.length - 1);
      }
      renderSlider(slider, scales, appearance);
    });
    addTabFocusTo(slider);
  }
}
