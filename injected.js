/**
 * @description 把元素下所有 video 加上控制条
 * @param {Element} element - 包含 video 的父节点
 */
function setVideoControl (element) {
  element.querySelectorAll('video').forEach(v => {
    if (v.dataset.videoControls) return
    v.dataset.videoControls = '1'
    v.controls = true
    v.setAttribute('controlsList', '')
  })
}

// 针对 Instagram 内部复杂的 div 嵌套结构进行样式修正
// 主要用于 Reels 这类界面
function handleInstanceDiv (video) {
  const siblings = []

  let cur = video.parentNode.firstElementChild

  while (cur) {
    siblings.push(cur)
    cur = cur.nextElementSibling
  }

  // 查找覆盖层特征的 div
  const instDiv = siblings.find(el => el.matches('[data-instancekey]') && el.querySelector('div[data-instancekey] > div[data-visualcompletion] div[role=presentation]'))
  if (!instDiv) return

  // 视觉渲染元素
  const visDiv = instDiv.querySelector('div[data-visualcompletion]')
  if (!visDiv) return

  // 调整高度，避免视频覆盖到控制条
  visDiv.style.bottom = '70px'
  visDiv.style.height = `calc(100% - 70px)`
}

// 单个 video 的主处理逻辑
function processVideo (videoElement) {
  // 跳过已经有控制条的视频
  if (videoElement.dataset.videoControls) return

  // 查找外层根容器
  const findRoot = vid => {
    // 获取 video 的尺寸和位置
    const videoRect = vid.getBoundingClientRect()

    // 判断某个元素是否在尺寸上覆盖 video
    const covers = element => {
      const rect = element.getBoundingClientRect()

      // 判断两个尺寸是否接近
      const isSizeApproximate = (d1, d2, ratio, px) => d1 && d2 && (Math.abs(d1 / d2) <= ratio || Math.abs(d1 - d2) <= px)

      // 同时比较宽度和高度
      return isSizeApproximate(videoRect.width, rect.width, 1.1, 100) && isSizeApproximate(videoRect.height, rect.height, 1.2, 100)
    }

    const parents = []

    // 向上查 4 层父元素
    for (let el = vid, i = 4; i-- && (el = el.parentElement); ) {
      parents.push(el)
    }

    for (const parentElement of parents) {
      const candidates = [...parentElement.querySelectorAll('[role=button],[role=presentation]')]

      if (candidates.some(covers)) return parentElement
    }

    return null
  }

  let root = findRoot(videoElement)

  // 如果没有，再向上取 4 层父节点，特殊情况才会用到
  if (!root) {
    let el = videoElement
    for (let i = 0; i < 4 && el; i++) el = el.parentElement
    root = el
  }

  if (root) {
    try {
      setVideoControl(root)
      handleInstanceDiv(videoElement)
    } catch {}
  }
}

// 坚挺页面
function start () {
  // 防止重复启动观察者
  if (start.observing) return
  start.observing = true

  new MutationObserver(muts => {
    // 储存新的 video 元素
    const videos = []

    muts.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.tagName === 'VIDEO') videos.push(node)
        if (node.querySelectorAll) videos.push(...node.querySelectorAll('video'))
      })
    })

    if (videos.length) videos.forEach(processVideo)
  }).observe(document.body, {
    subtree: true,
    childList: true
  })

  document.querySelectorAll('video').forEach(processVideo)
}

document.addEventListener('visibilitychange', start)
start()
