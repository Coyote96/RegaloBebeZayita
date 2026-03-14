const elements = {
    clawMachine: document.querySelector('.claw-machine'),
    box: document.querySelector('.box'),
    collectionBox: document.querySelector('.collection-box'),
    collectionArrow: document.querySelector('.collection-arrow'),
    toys: [],
    prizeModal: document.querySelector('.prize-modal'),
    prizeModalText: document.querySelector('.prize-modal__text'),
    prizeModalImage: document.querySelector('.prize-modal__image'),
    prizeModalOk: document.querySelector('.prize-modal__ok'),
    gameStage: document.querySelector('.game-stage'),
    wrapper: document.querySelector('.wrapper'),
  }

  const settings = {
    targetToy: null,
    collectedNumber: 0,
    isPrizeModalOpen: false,
    failedAttempts: 0,
    resetOnModalClose: false,
    pendingCompletionModal: false,
    isHoriMoving: false,
    isVertSequenceRunning: false,
    isVertMovingDown: false,
  }

  const m = 2
  const toys = {
    bear: {
      w: 20 * m,
      h: 27 * m,
    },
    bunny: {
      w: 20 * m,
      h: 29 * m,
    },
    golem: {
      w: 20 * m,
      h: 27 * m,
    },
    cucumber: {
      w: 16 * m,
      h: 28 * m,
    },
    penguin: {
      w: 24 * m,
      h: 22 * m,
    },
    robot: {
      w: 20 * m,
      h: 30 * m,
    },
    cat: {
      w: 20 * m,
      h: 28 * m,
    },
    duck: {
      w: 22 * m,
      h: 26 * m,
    },
    frog: {
      w: 24 * m,
      h: 28 * m,
    },
    fox: {
      w: 22 * m,
      h: 29 * m,
    },
    panda: {
      w: 22 * m,
      h: 28 * m,
    },
    pig: {
      w: 22 * m,
      h: 28 * m,
    },
  }

  const buildNonRepeatingToyList = () => {
    const pool = [...Object.keys(toys)]

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }

    return pool
  }

  const sortedToys = buildNonRepeatingToyList()

  const toyLabels = {
    bear: 'michi',
    bunny: 'nachos',
    cat: 'oso',
    cucumber: 'zafiro',
    duck: 'satoru',
    fox: 'Isu',
    frog: 'snoopy',
    golem: 'r6',
    panda: 'scream',
    penguin: 'luna',
    pig: 'helado',
    robot: 'coyote',
  }

  const prizeMessages = {
    bear: 'Uyy salio uno de los miles de michitos que tiene mi bebe!',
    bunny: 'Ufff unos nachitos del denys ee',
    cat: 'Felicidades! Encontraste tu osito!',
    cucumber: 'Te salió un zafiro brillante, igual de bello y especial que tu!.',
    duck: 'Te tocó Satoru... el virtual',
    fox: 'La silla de suzume! por que su musica es una de tus favoritas!',
    frog: 'Te salió Snoopy bebe, me dijiste que te encataba jajaj',
    golem: 'Ruuun Ruun! la maldita yamaha R6',
    panda: 'mmmm scream? no andes viendo hombres en tiktok...',
    penguin: 'Una luna Roja por que me dijiste que te gustaba!',
    pig: 'con 3 palitos porfavor...',
    robot: 'YO?',
  }

  const getPrizeModalMessage = toyType => {
    const prizeName = toyLabels[toyType] || toyType
    const customMessage = prizeMessages[toyType] || 'Disfruta mucho tu premio especial.'
    return `
      <span class="prize-modal__title">¡Felicidades, sacaste a ${prizeName}!</span>
      <span class="prize-modal__subtitle">${customMessage}</span>
    `
  }

  const cornerBuffer = 16

  const machineBuffer = {
    x: 36,
    y: 16,
  }

  const mobileReactionBoost = {
    clawHitboxX: 12,
    clawHitboxY: 8,
    edgeHitboxBonus: 10,
  }

  const radToDeg = rad => Math.round(rad * (180 / Math.PI))
  const calcX = (i, n) => i % n
  const calcY = (i, n) => Math.floor(i / n)

  const {
    width: machineWidth,
    height: machineHeight,
    top: machineTop,
  } = document.querySelector('.claw-machine').getBoundingClientRect()

  const { height: machineTopHeight } = document
    .querySelector('.machine-top')
    .getBoundingClientRect()

  const { height: machineBottomHeight, top: machineBottomTop } = document
    .querySelector('.machine-bottom')
    .getBoundingClientRect()

  const maxArmLength = machineBottomTop - machineTop - machineBuffer.y

  const adjustAngle = angle => {
    const adjustedAngle = angle % 360
    return adjustedAngle < 0 ? adjustedAngle + 360 : adjustedAngle
  }

  const randomN = (min, max) => {
    return Math.round(min - 0.5 + Math.random() * (max - min + 1))
  }

  //* classes *//

  class Button {
    constructor({ className, action, isLocked, touchEvent = 'touchstart' }) {
      Object.assign(this, {
        el: document.querySelector(`.${className}`),
        isLocked,
        lastTouchAt: 0,
        touchEvent,
      })

      const handleTap = event => {
        const now = Date.now()

        if (event.type === 'click' && now - this.lastTouchAt < 700) return
        if (event.type === this.touchEvent) this.lastTouchAt = now

        event.preventDefault()
        event.stopPropagation()
        if (typeof action === 'function') action(event)
      }

      this.el.addEventListener('click', handleTap)
      this.el.addEventListener(this.touchEvent, handleTap, { passive: false })
      this.el.addEventListener('contextmenu', event => event.preventDefault())

      if (!isLocked) this.activate()
    }
    activate() {
      this.isLocked = false
      this.el.classList.add('active')
    }
    deactivate() {
      this.isLocked = true
      this.el.classList.remove('active')
    }
  }

  class WorldObject {
    constructor(props) {
      Object.assign(this, {
        x: 0,
        y: 0,
        z: 0,
        angle: 0,
        transformOrigin: { x: 0, y: 0 },
        interval: null,
        default: {},
        moveWith: [],
        el: props.className && document.querySelector(`.${props.className}`),
        ...props,
      })
      this.setStyles()
      if (props.className) {
        const { width, height } = this.el.getBoundingClientRect()
        this.w = width
        this.h = height
      }
      ;['x', 'y', 'w', 'h'].forEach(key => {
        this.default[key] = this[key]
      })
    }
    setStyles() {
      Object.assign(this.el.style, {
        left: `${this.x}px`,
        top: !this.bottom && `${this.y}px`,
        bottom: this.bottom,
        width: `${this.w}px`,
        height: `${this.h}px`,
        transformOrigin: this.transformOrigin,
      })
      this.el.style.zIndex = this.z
    }
    setClawPos(clawPos) {
      this.clawPos = clawPos
    }
    setTransformOrigin(transformOrigin) {
      this.transformOrigin =
        transformOrigin === 'center'
          ? 'center'
          : `${transformOrigin.x}px ${transformOrigin.y}px`
      this.setStyles()
    }
    handleNext(next) {
      clearInterval(this.interval)
      if (next) next()
    }
    resumeMove({ moveKey, target, moveTime, next }) {
      this.interval = null
      this.move({ moveKey, target, moveTime, next })
    }
    resizeShadow() {
      elements.box.style.setProperty('--scale', 0.5 + this.h / maxArmLength / 2)
    }
    move({ moveKey, target, moveTime, next }) {
      if (this.interval) {
        this.handleNext(next)
      } else {
        const moveTarget = target || this.default[moveKey]
        this.interval = setInterval(() => {
          const distance =
            Math.abs(this[moveKey] - moveTarget) < 10
              ? Math.abs(this[moveKey] - moveTarget)
              : 10
          const increment = this[moveKey] > moveTarget ? -distance : distance
          if (
            increment > 0
              ? this[moveKey] < moveTarget
              : this[moveKey] > moveTarget
          ) {
            this[moveKey] += increment
            this.setStyles()
            if (moveKey === 'h') this.resizeShadow()
            if (this.moveWith.length) {
              this.moveWith.forEach(obj => {
                if (!obj) return
                obj[moveKey === 'h' ? 'y' : moveKey] += increment
                obj.setStyles()
              })
            }
          } else {
            this.handleNext(next)
          }
        }, moveTime || 100)
      }
    }
    distanceBetween(target) {
      return Math.round(
        Math.sqrt(
          Math.pow(this.x - target.x, 2) + Math.pow(this.y - target.y, 2),
        ),
      )
    }
  }

  class Toy extends WorldObject {
    constructor(props) {
      const toyType = sortedToys[props.index]
      const size = toys[toyType]
      super({
        el: Object.assign(document.createElement('div'), {
          className: `toy pix ${toyType}`,
        }),
        x:
          cornerBuffer +
          calcX(props.index, 4) * ((machineWidth - cornerBuffer * 3) / 4) +
          size.w / 2 +
          randomN(-6, 6),
        y:
          machineBottomTop -
          machineTop +
          cornerBuffer +
          calcY(props.index, 4) *
            ((machineBottomHeight - cornerBuffer * 2) / 3) -
          size.h / 2 +
          randomN(-2, 2),
        z: 0,
        toyType,
        ...size,
        ...props,
      })
      elements.box.append(this.el)
      const toy = this

      this.el.addEventListener('click', () => this.collectToy(toy))
      elements.toys.push(this)
    }
    collectToy(toy) {
      toy.el.classList.remove('selected')
      elements.toys = elements.toys.filter(t => t !== toy)
      toy.x = machineWidth / 2 - toy.w / 2
      toy.y = machineHeight / 2 - toy.h / 2
      toy.z = 7
      toy.el.style.setProperty('--rotate-angle', '0deg')
      toy.setTransformOrigin('center')
      toy.el.classList.add('display')
      elements.clawMachine.classList.add('show-overlay')
      settings.collectedNumber++
      elements.collectionBox.appendChild(
        Object.assign(document.createElement('div'), {
          className: `toy-wrapper ${
            settings.collectedNumber > 6 ? 'squeeze-in' : ''
          }`,
          innerHTML: `<div class="toy pix ${toy.toyType}"></div>`,
        }),
      )
      const prizeText = getPrizeModalMessage(toy.toyType)
      if (settings.collectedNumber === sortedToys.length) {
        settings.pendingCompletionModal = true
      }
      showPrizeModal(prizeText, toy.toyType)
    }
    setRotateAngle() {
      const angle =
        radToDeg(
          Math.atan2(
            this.y + this.h / 2 - this.clawPos.y,
            this.x + this.w / 2 - this.clawPos.x,
          ),
        ) - 90
      const adjustedAngle = Math.round(adjustAngle(angle))
      this.angle =
        adjustedAngle < 180 ? adjustedAngle * -1 : 360 - adjustedAngle
      this.el.style.setProperty('--rotate-angle', `${this.angle}deg`)
    }
  }

  const resetGame = () => {
    window.location.reload()
  }

  const closePrizeModal = event => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!settings.isPrizeModalOpen) return
    const shouldResetGame = settings.resetOnModalClose
    settings.isPrizeModalOpen = false
    settings.resetOnModalClose = false
    elements.prizeModal.classList.remove('show')
    elements.prizeModal.setAttribute('aria-hidden', 'true')
    elements.prizeModalText.innerHTML = ''
    elements.prizeModalImage.removeAttribute('src')
    elements.prizeModalImage.classList.remove('show')
    document.body.classList.remove('modal-open')
    elements.clawMachine.classList.remove('show-overlay')
    if (shouldResetGame) {
      resetGame()
      return
    }
    if (settings.pendingCompletionModal) {
      settings.pendingCompletionModal = false
      showPrizeModal(
        '<span class="prize-modal__title">¡Felicidades! Completaste el juego</span><span class="prize-modal__subtitle">Agarraste todos los regalos. ✨</span>',
        null,
      )
      return
    }
    if (!document.querySelector('.selected'))
      elements.collectionArrow.classList.remove('active')
    activateHoriBtn()
  }

  const showPrizeModal = (message, toyType, options = {}) => {
    settings.isPrizeModalOpen = true
    settings.resetOnModalClose = Boolean(options.resetOnClose)
    elements.prizeModalText.innerHTML = message
    if (toyType) {
      elements.prizeModalImage.src = `./assets/${toyType}-normal.png`
      elements.prizeModalImage.alt = `Premio ganado: ${toyLabels[toyType]}`
      elements.prizeModalImage.classList.add('show')
    } else {
      elements.prizeModalImage.removeAttribute('src')
      elements.prizeModalImage.classList.remove('show')
    }
    elements.prizeModal.classList.add('show')
    elements.prizeModal.setAttribute('aria-hidden', 'false')
    document.body.classList.add('modal-open')
    horiBtn.deactivate()
    vertBtn.deactivate()
    setTimeout(() => elements.prizeModalOk.focus(), 0)
  }

  elements.prizeModalOk.addEventListener('click', closePrizeModal)
  elements.prizeModalOk.addEventListener('touchend', closePrizeModal)
  elements.prizeModal.addEventListener('click', event => {
    if (event.target.classList.contains('prize-modal__backdrop')) {
      event.preventDefault()
    }
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && settings.isPrizeModalOpen) closePrizeModal(event)
  })


  const bgMusic = document.getElementById('bgMusic')

  const tryPlayBgMusic = () => {
    if (!bgMusic) return
    const playPromise = bgMusic.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {})
    }
  }

  window.addEventListener('load', tryPlayBgMusic)
  document.addEventListener('click', tryPlayBgMusic, { once: true })
  document.addEventListener('touchstart', tryPlayBgMusic, { once: true })
  document.addEventListener('keydown', tryPlayBgMusic, { once: true })

  const blockGameGesture = event => {
    if (!event.target.closest('.game-stage') && !event.target.closest('.prize-modal')) return
    event.preventDefault()
  }

  const updateResponsiveScale = () => {
    if (!elements.gameStage || !elements.wrapper) return

    elements.gameStage.style.setProperty('--game-scale', '1')

    const viewportWidth = window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth
    const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight
    const isMobileViewport = viewportWidth <= 900
    const isPortraitMobile = isMobileViewport && viewportHeight >= viewportWidth

    elements.wrapper.classList.toggle('mobile-portrait', isPortraitMobile)

    const horizontalPadding = isMobileViewport ? 28 : 24
    const verticalPadding = isPortraitMobile ? 118 : isMobileViewport ? 44 : 24

    const stageRect = elements.gameStage.getBoundingClientRect()
    const availableWidth = Math.max(220, viewportWidth - horizontalPadding)
    const availableHeight = Math.max(320, viewportHeight - verticalPadding)
    const widthScale = availableWidth / stageRect.width
    const heightScale = availableHeight / stageRect.height
    const fittedScale = Math.min(1, widthScale, heightScale)
    const nextScale = Math.max(isPortraitMobile ? 0.46 : 0.58, fittedScale * (isPortraitMobile ? 0.88 : 0.98))

    elements.gameStage.style.setProperty('--game-scale', nextScale.toFixed(3))

    if (isPortraitMobile) {
      window.scrollTo(0, 0)
    }
  }


  //* set up *//
  elements.box.style.setProperty('--shadow-pos', `${maxArmLength}px`)

  const armJoint = new WorldObject({
    className: 'arm-joint',
  })

  const vertRail = new WorldObject({
    className: 'vert',
    moveWith: [null, armJoint],
  })

  const arm = new WorldObject({
    className: 'arm',
  })

  armJoint.resizeShadow()

  armJoint.move({
    moveKey: 'y',
    target: machineTopHeight - machineBuffer.y,
    moveTime: 50,
    next: () =>
      vertRail.resumeMove({
        moveKey: 'x',
        target: machineBuffer.x,
        moveTime: 50,
        next: () => {
          Object.assign(armJoint.default, {
            y: machineTopHeight - machineBuffer.y,
            x: machineBuffer.x,
          })
          Object.assign(vertRail.default, {
            x: machineBuffer.x,
          })
          activateHoriBtn()
        },
      }),
  })

  const doOverlap = (a, b) => {
    return b.x > a.x && b.x < a.x + a.w && b.y > a.y && b.y < a.y + a.h
  }

  const getClosestToy = () => {
    const nearLeftEdge = armJoint.x <= machineBuffer.x + 24
    const nearRightEdge = armJoint.x >= machineWidth - armJoint.w - machineBuffer.x - 24
    const edgeBonus = nearLeftEdge || nearRightEdge ? mobileReactionBoost.edgeHitboxBonus : 0

    const claw = {
      y: armJoint.y + maxArmLength + machineBuffer.y + 7 - mobileReactionBoost.clawHitboxY,
      x: armJoint.x + 7 - mobileReactionBoost.clawHitboxX - edgeBonus,
      w: 40 + mobileReactionBoost.clawHitboxX * 2 + edgeBonus * 2,
      h: 32 + mobileReactionBoost.clawHitboxY * 2,
    }
    const overlappedToys = elements.toys.filter(t => {
      return doOverlap(t, claw)
    })

    if (overlappedToys.length) {
      const toy = overlappedToys.sort((a, b) => b.index - a.index)[0]
      toy.setTransformOrigin({
        x: claw.x - toy.x,
        y: claw.y - toy.y,
      })
      toy.setClawPos({
        x: claw.x,
        y: claw.y,
      })
      settings.targetToy = toy
    }
  }

  sortedToys.forEach((_, i) => {
    new Toy({ index: i })
  })

  const stopHoriBtnAndActivateVertBtn = () => {
    armJoint.interval = null
    settings.isHoriMoving = false
    horiBtn.deactivate()
    vertBtn.activate()
  }

  const activateHoriBtn = () => {
    settings.isHoriMoving = false
    settings.isVertSequenceRunning = false
    settings.isVertMovingDown = false
    horiBtn.activate()
    ;[vertRail, armJoint, arm].forEach(c => (c.interval = null))
  }

  const dropToy = () => {
    const grabbedToy = settings.targetToy
    arm.el.classList.add('open')
    if (grabbedToy) {
      grabbedToy.z = 3
      grabbedToy.move({
        moveKey: 'y',
        target: machineHeight - grabbedToy.h - 30,
        moveTime: 50,
      })
      ;[vertRail, armJoint, arm].forEach(obj => (obj.moveWith[0] = null))
    }
    setTimeout(() => {
      arm.el.classList.remove('open')
      if (grabbedToy) {
        activateHoriBtn()
        grabbedToy.el.classList.add('selected')
        elements.collectionArrow.classList.add('active')
        settings.targetToy = null
        return
      }

      settings.failedAttempts++
      if (settings.failedAttempts >= 1) {
        showPrizeModal('Suerte para la próxima', null, { resetOnClose: true })
        return
      }

      activateHoriBtn()
    }, 700)
  }

  const grabToy = () => {
    if (settings.targetToy) {
      ;[vertRail, armJoint, arm].forEach(
        obj => (obj.moveWith[0] = settings.targetToy),
      )
      settings.targetToy.setRotateAngle()
      settings.targetToy.el.classList.add('grabbed')
    } else {
      arm.el.classList.add('missed')
    }
  }

  const horiBtn = new Button({
    className: 'hori-btn',
    isLocked: true,
    action: () => {
      if (settings.isPrizeModalOpen || horiBtn.isLocked || settings.isVertSequenceRunning) return
      arm.el.classList.remove('missed')

      if (!settings.isHoriMoving) {
        settings.isHoriMoving = true
        vertRail.move({
          moveKey: 'x',
          target: machineWidth - armJoint.w - machineBuffer.x,
          next: stopHoriBtnAndActivateVertBtn,
        })
        return
      }

      clearInterval(vertRail.interval)
      stopHoriBtnAndActivateVertBtn()
    },
  })

  const continueVerticalSequence = () => {
    settings.isVertMovingDown = false
    settings.isVertSequenceRunning = true
    vertBtn.deactivate()
    clearInterval(armJoint.interval)
    armJoint.interval = null
    getClosestToy()
    setTimeout(() => {
      arm.el.classList.add('open')
      arm.move({
        moveKey: 'h',
        target: maxArmLength,
        next: () =>
          setTimeout(() => {
            arm.el.classList.remove('open')
            grabToy()
            arm.resumeMove({
              moveKey: 'h',
              next: () => {
                vertRail.resumeMove({
                  moveKey: 'x',
                  next: () => {
                    armJoint.resumeMove({
                      moveKey: 'y',
                      next: dropToy,
                    })
                  },
                })
              },
            })
          }, 500),
      })
    }, 250)
  }

  const vertBtn = new Button({
    className: 'vert-btn',
    isLocked: true,
    touchEvent: 'touchstart',
    action: () => {
      if (settings.isPrizeModalOpen || vertBtn.isLocked || settings.isVertSequenceRunning) return

      if (!settings.isVertMovingDown) {
        settings.isVertMovingDown = true
        armJoint.move({
          moveKey: 'y',
          target: machineBuffer.y,
          next: continueVerticalSequence,
        })
        return
      }

      continueVerticalSequence()
    },
  })

  const stopTouchDefaults = event => {
    event.preventDefault()
  }

  ;['contextmenu', 'selectstart', 'dragstart'].forEach(eventName => {
    document.addEventListener(eventName, event => {
      if (event.target.closest('.game-stage')) {
        event.preventDefault()
      }
    })
  })

  ;['gesturestart', 'gesturechange', 'gestureend'].forEach(eventName => {
    document.addEventListener(eventName, blockGameGesture, { passive: false })
  })

  ;[horiBtn.el, vertBtn.el, elements.prizeModalOk].forEach(el => {
    ;['touchstart', 'touchmove'].forEach(eventName => {
      el.addEventListener(eventName, stopTouchDefaults, { passive: false })
    })
  })

  window.addEventListener('resize', updateResponsiveScale)
  window.addEventListener('orientationchange', updateResponsiveScale)
  window.addEventListener('load', updateResponsiveScale)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateResponsiveScale)
    window.visualViewport.addEventListener('scroll', updateResponsiveScale)
  }
  document.addEventListener('DOMContentLoaded', () => {
    updateResponsiveScale()
    setTimeout(updateResponsiveScale, 50)
    setTimeout(updateResponsiveScale, 250)
  })

  updateResponsiveScale()
