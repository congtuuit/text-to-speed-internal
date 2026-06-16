import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import './index.css'
import { API_BASE_URL } from './config'
const VIETNAMESE_SAMPLE_TEXTS = [
  "Hôm nay thời tiết thật là đẹp, tôi muốn đi dạo quanh hồ.",
  "Chúc bạn một ngày mới tràn đầy năng lượng và niềm vui.",
  "Cuốn sách này rất hay, nó mang lại nhiều bài học ý nghĩa.",
  "Trí tuệ nhân tạo đang thay đổi cuộc sống của chúng ta.",
  "Công nghệ ngày càng phát triển vượt bậc qua từng ngày.",
  "Chúng tôi cam kết mang lại sản phẩm tốt nhất cho bạn.",
  "Hãy kiên trì theo đuổi ước mơ của mình đến cùng nhé.",
  "Âm thanh tiếng Việt nghe thật truyền cảm và ấm áp.",
  "Học hỏi là một hành trình trọn đời không bao giờ kết thúc.",
  "Mỗi ngày trôi qua đều là một cơ hội để học điều mới."
];

function App() {
  const { t, i18n } = useTranslation()
  const [inputDir, setInputDir] = useState(() => localStorage.getItem('tts_input_dir') || '')
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem('tts_output_dir') || '')
  const [voice, setVoice] = useState(() => localStorage.getItem('tts_voice') || 'Aoede')
  const [testText, setTestText] = useState(() => localStorage.getItem('tts_test_text') || 'Xin chào, đây là giọng đọc thử.')
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState(() => localStorage.getItem('tts_model_name') || 'gemini-2.5-flash-preview-tts')
  const [models, setModels] = useState([])
  const [provider, setProvider] = useState(() => {
    let p = localStorage.getItem('tts_provider');
    if (p === 'vieneu') return 'self_hosted';
    return p || 'self_hosted';
  })
  const [fptApiKeys, setFptApiKeys] = useState(() => localStorage.getItem('tts_fpt_api_keys') || '')
  const [fptSpeed, setFptSpeed] = useState(() => localStorage.getItem('tts_fpt_speed') || 0)
  const [selfHostedUrl, setSelfHostedUrl] = useState(() => localStorage.getItem('tts_self_hosted_url') || 'http://localhost:7860')
  const [maxWorkers, setMaxWorkers] = useState(() => parseInt(localStorage.getItem('tts_max_workers')) || 3)
  const [voices, setVoices] = useState([])
  const [seed, setSeed] = useState(() => localStorage.getItem('tts_self_hosted_seed') || '')
  const [outputSpeed, setOutputSpeed] = useState(() => parseFloat(localStorage.getItem('tts_output_speed')) || 1.0)

  const [savedDbSeed, setSavedDbSeed] = useState('')
  const [savedDbVoice, setSavedDbVoice] = useState('')

  const [isScanning, setIsScanning] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const [docxChunksDir, setDocxChunksDir] = useState(null)
  const [isTestingVoice, setIsTestingVoice] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)

  const [quickText, setQuickText] = useState(() => localStorage.getItem('tts_quick_text') || '')
  const [isQuickConverting, setIsQuickConverting] = useState(false)
  const [quickAudioUrl, setQuickAudioUrl] = useState(null)

  const [progressJobs, setProgressJobs] = useState([])
  const [expandedJobs, setExpandedJobs] = useState({})   // job_id -> bool
  const [jobTasks, setJobTasks] = useState({})            // job_id -> []

  const fetchModels = async (key) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/models?api_key=${key}`)
      const data = await res.json()
      if (data.models) {
        setModels(data.models)
      }
    } catch (err) { }
  }

  const fetchVoices = async (prov, shUrl) => {
    try {
      let url = `${API_BASE_URL}/api/voices?provider=${prov}`
      if (prov === 'self_hosted') {
        const urlParam = shUrl || selfHostedUrl
        url += `&self_hosted_url=${encodeURIComponent(urlParam)}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setVoices(data || [])

      if (data && data.length > 0) {
        const currentVoice = localStorage.getItem('tts_voice') || voice;
        const exist = data.find(v => v.id === currentVoice);
        if (!exist) {
          setVoice(data[0].id);
        }
      }

      return data || []
    } catch (err) {
      return []
    }
  }

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.api_key) {
          setApiKey(data.api_key)
          fetchModels(data.api_key)
        }
        if (data.model_name) {
          setModelName(data.model_name)
        }
        if (data.provider) {
          setProvider(data.provider)
          setFptApiKeys(data.fpt_api_keys || '')
          if (data.fpt_speed !== undefined) setFptSpeed(data.fpt_speed)
          if (data.max_workers !== undefined) setMaxWorkers(data.max_workers)
          setSelfHostedUrl(data.self_hosted_url || 'http://localhost:7860')
          if (data.self_hosted_seed !== undefined) {
            setSeed(data.self_hosted_seed)
            setSavedDbSeed(data.self_hosted_seed)
          }
          if (data.self_hosted_voice !== undefined) {
            setSavedDbVoice(data.self_hosted_voice)
          }
          if (data.output_speed !== undefined) {
            setOutputSpeed(parseFloat(data.output_speed))
          }

          fetchVoices(data.provider || 'self_hosted', data.self_hosted_url || 'http://localhost:7860')
        } else {
          fetchVoices('self_hosted')
        }
      })
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    localStorage.setItem('tts_input_dir', inputDir)
    localStorage.setItem('tts_output_dir', outputDir)
    localStorage.setItem('tts_voice', voice)
    localStorage.setItem('tts_test_text', testText)
    localStorage.setItem('tts_model_name', modelName)
    localStorage.setItem('tts_provider', provider)
    localStorage.setItem('tts_fpt_api_keys', fptApiKeys)
    localStorage.setItem('tts_fpt_speed', fptSpeed)
    localStorage.setItem('tts_max_workers', maxWorkers)
    localStorage.setItem('tts_self_hosted_url', selfHostedUrl)
    localStorage.setItem('tts_self_hosted_seed', seed)
    localStorage.setItem('tts_output_speed', outputSpeed)
  }, [inputDir, outputDir, voice, testText, modelName, provider, fptApiKeys, fptSpeed, maxWorkers, selfHostedUrl, seed, outputSpeed])

  const fetchJobTasks = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/tasks`)
      const data = await res.json()
      if (data && data.tasks) {
        setJobTasks(prev => ({ ...prev, [jobId]: data.tasks }))
      }
    } catch (err) { }
  }

  const toggleJobExpand = (jobId) => {
    const next = !expandedJobs[jobId]
    setExpandedJobs(prev => ({ ...prev, [jobId]: next }))
    if (next) fetchJobTasks(jobId)
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobs/active/progress`)
        const data = await res.json()
        if (data && data.jobs) {
          setProgressJobs(data.jobs)
          // Cập nhật task list cho các job đang mở
          for (const job of data.jobs) {
            if (expandedJobs[job.job_id]) {
              fetchJobTasks(job.job_id)
            }
          }
        }
      } catch (err) {
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [expandedJobs])

  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, model_name: modelName, provider: provider, fpt_api_keys: fptApiKeys, fpt_speed: parseFloat(fptSpeed), max_workers: parseInt(maxWorkers), self_hosted_url: selfHostedUrl, output_speed: parseFloat(outputSpeed) })
      })
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Lưu thành công!', background: '#1e293b', color: '#fff', timer: 1500, showConfirmButton: false });
        fetchModels(apiKey)
      }
    } catch (err) {
      alert(t("alerts.save_failed"))
    }
  }

  const handleModelChange = async (e) => {
    const newModel = e.target.value;
    setModelName(newModel);
    try {
      await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, model_name: newModel, provider: provider, fpt_api_keys: fptApiKeys, fpt_speed: parseFloat(fptSpeed), max_workers: parseInt(maxWorkers), self_hosted_url: selfHostedUrl, output_speed: parseFloat(outputSpeed) })
      });
    } catch (err) { }
  }

  const handleProviderChange = async (e) => {
    const newProvider = e.target.value;
    setProvider(newProvider);
    const newVoices = await fetchVoices(newProvider, selfHostedUrl);
    if (newVoices.length > 0) {
      setVoice(newVoices[0].id);
    }
    try {
      await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, model_name: modelName, provider: newProvider, fpt_api_keys: fptApiKeys, fpt_speed: parseFloat(fptSpeed), max_workers: parseInt(maxWorkers), self_hosted_url: selfHostedUrl, output_speed: parseFloat(outputSpeed) })
      });
    } catch (err) { }
  }

  const handleScan = async () => {
    setIsScanning(true)
    setDocxChunksDir(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: inputDir })
      })
      const data = await res.json()
      if (res.ok) {
        setFileCount(data.total)
      } else {
        alert(t("alerts.scan_error") + (data.detail || "Unknown error"))
      }
    } catch (err) {
      alert(t("alerts.conn_error"))
    }
    setIsScanning(false)
  }

  const handleBrowse = async (setter) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/browse-folder`)
      const data = await res.json()
      if (data.path) {
        setter(data.path)
      } else if (data.error) {
        console.error("Browse error:", data.error)
      }
    } catch (err) {
      alert(t("alerts.browse_error"))
    }
  }

  const handleBrowseDocx = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/browse-docx`)
      const data = await res.json()
      if (data.path) {
        const splitRes = await fetch(`${API_BASE_URL}/api/docx/split`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docx_path: data.path, output_dir: outputDir, voice: voice, model_name: modelName, api_key: apiKey, provider: provider, fpt_api_keys: fptApiKeys, fpt_speed: parseFloat(fptSpeed), max_workers: parseInt(maxWorkers), self_hosted_url: selfHostedUrl, output_speed: parseFloat(outputSpeed) })
        })
        const splitData = await splitRes.json()
        if (splitRes.ok) {
          setDocxChunksDir(splitData.chunks_dir)
          setFileCount(splitData.total_files)
          Swal.fire({
            icon: 'success',
            title: 'Tách file thành công',
            text: `Đã tách thành ${splitData.total_files} file nhỏ tại ${splitData.chunks_dir}. Vui lòng kiểm tra và bấm "Bắt đầu chuyển đổi" để chạy.`,
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#3b82f6'
          })
        } else {
          Swal.fire({ icon: 'error', title: 'Lỗi', text: splitData.detail || "Unknown error", background: '#1e293b', color: '#fff' })
        }
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: "Lỗi mạng khi chọn DOCX", background: '#1e293b', color: '#fff' })
    }
  }

  const handleBrowseBatchDocx = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/browse-folder`)
      const data = await res.json()
      if (data.path) {
        Swal.fire({
          title: 'Đang xử lý...',
          text: 'Vui lòng chờ hệ thống cắt nhỏ các file DOCX...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading()
          },
          background: '#1e293b',
          color: '#fff'
        })
        const submitRes = await fetch(`${API_BASE_URL}/api/docx/batch-submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder_path: data.path, output_dir: outputDir, voice: voice, model_name: modelName, api_key: apiKey, provider: provider, fpt_api_keys: fptApiKeys, fpt_speed: parseFloat(fptSpeed), max_workers: parseInt(maxWorkers), self_hosted_url: selfHostedUrl, output_speed: parseFloat(outputSpeed) })
        })
        const submitData = await submitRes.json()
        if (submitRes.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Thành công',
            text: `Đã tạo ${submitData.total_jobs} tiến trình xử lý cho tổng cộng ${submitData.total_files} file văn bản nhỏ. Bạn có thể theo dõi tiến độ ở khung bên dưới.`,
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#3b82f6'
          })
        } else {
          Swal.fire({ icon: 'error', title: 'Lỗi', text: submitData.detail || "Unknown error", background: '#1e293b', color: '#fff' })
        }
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: "Lỗi mạng khi chọn Folder DOCX", background: '#1e293b', color: '#fff' })
    }
  }

  const handleStartJob = async () => {
    try {
      const targetInputDir = docxChunksDir || inputDir;
      const res = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_dir: targetInputDir, output_dir: outputDir, voice: voice, model_name: modelName, api_key: apiKey, provider: provider, fpt_api_keys: fptApiKeys, fpt_speed: parseFloat(fptSpeed), max_workers: parseInt(maxWorkers), self_hosted_url: selfHostedUrl, output_speed: parseFloat(outputSpeed) })
      })
      const data = await res.json()
      if (res.ok) {
        alert(t("alerts.start_job", { jobId: data.job_id, files: data.total_files }))
      } else {
        alert(t("alerts.start_job_error") + (data.detail || "Unknown error"))
      }
    } catch (err) {
      alert(t("alerts.conn_error"))
    }
  }

  const handleDeleteJob = async (jobId) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa?',
      text: "Bạn có chắc muốn xoá tiến trình này không?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Có, Xóa!',
      cancelButtonText: 'Huỷ',
      background: '#1e293b',
      color: '#fff'
    })

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, { method: 'DELETE' })
      if (res.ok) {
        setProgressJobs(prev => prev.filter(j => j.job_id !== jobId))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleRetryTask = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/retry`, { method: 'POST' })
      if (res.ok) {
        // Will be updated by the next polling
      }
    } catch (err) {
      console.error("Retry failed", err)
    }
  }

  const handleResetStuck = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/reset-stuck`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Reset thành công',
          text: `Đã reset ${data.reset_count} task bị kẹt về Pending. Workers đã tiếp tục xử lý.`,
          background: '#1e293b',
          color: '#fff',
          timer: 2500,
          showConfirmButton: false
        })
      }
    } catch (err) {
      console.error('Reset stuck failed', err)
    }
  }

  const handleCheckConnection = async () => {
    if (!selfHostedUrl.trim()) {
      Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập URL trước khi kiểm tra!', background: '#1e293b', color: '#fff' });
      return;
    }
    Swal.fire({
      title: 'Đang kiểm tra...',
      text: 'Đang kết nối tới server model...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
      background: '#1e293b',
      color: '#fff'
    });
    try {
      const res = await fetch(`${API_BASE_URL}/api/self-hosted/check-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ self_hosted_url: selfHostedUrl })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const data = result.data;
        let details = `Model: ${data.model || 'OmniVoice'} (Trạng thái: ${data.status || 'ok'})\n`;
        if (data.ram_used_gb !== undefined) {
          details += `RAM: ${data.ram_used_gb}GB / ${data.ram_total_gb}GB (${data.ram_percent}%)\n`;
        }
        if (data.cpu_percent !== undefined) {
          details += `CPU: ${data.cpu_percent}%`;
        }
        Swal.fire({
          icon: 'success',
          title: 'Kết nối thành công!',
          html: `<pre style="text-align: left; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 6px; color: #10b981; font-family: monospace;">${details}</pre>`,
          background: '#1e293b',
          color: '#fff',
          confirmButtonColor: '#3b82f6'
        });
        fetchVoices('self_hosted', selfHostedUrl);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Kết nối thất bại',
          text: result.detail || 'Không thể kết nối tới server.',
          background: '#1e293b',
          color: '#fff',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi kết nối',
        text: 'Không thể gửi yêu cầu kiểm tra kết nối tới backend.',
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  const handleRandomizeTestText = () => {
    let randomText = VIETNAMESE_SAMPLE_TEXTS[Math.floor(Math.random() * VIETNAMESE_SAMPLE_TEXTS.length)];
    while (randomText === testText && VIETNAMESE_SAMPLE_TEXTS.length > 1) {
      randomText = VIETNAMESE_SAMPLE_TEXTS[Math.floor(Math.random() * VIETNAMESE_SAMPLE_TEXTS.length)];
    }
    setTestText(randomText);
  };

  const handleTestVoice = async () => {
    setIsTestingVoice(true)
    setAudioUrl(null)

    let currentSeed = seed;
    if (!currentSeed || currentSeed.trim() === '') {
      currentSeed = Math.floor(Math.random() * 1000000000).toString();
      setSeed(currentSeed);
    }

    const keepVoiceVal = (currentSeed === savedDbSeed && voice === savedDbVoice) ? "true" : "false";

    try {
      const res = await fetch(`${API_BASE_URL}/api/test-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: voice,
          text: testText,
          api_key: apiKey,
          model_name: modelName,
          provider: provider,
          fpt_api_keys: fptApiKeys,
          fpt_speed: parseFloat(fptSpeed),
          self_hosted_url: selfHostedUrl,
          seed: currentSeed,
          keep_voice: keepVoiceVal,
          output_speed: parseFloat(outputSpeed)
        })
      })
      if (res.ok) {
        const blob = await res.blob()
        setAudioUrl(URL.createObjectURL(blob))
      } else {
        const errData = await res.json()
        Swal.fire({
          icon: 'error',
          title: provider === 'gemini' ? 'Gemini API Error' : 'FPT AI TTS Error',
          text: errData.detail || t("alerts.test_voice_error"),
          background: '#1e293b',
          color: '#fff',
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: t("alerts.conn_error"),
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      })
    }
    setIsTestingVoice(false)
  }

  const handleSaveVoiceConfig = async () => {
    let currentSeed = seed;
    if (!currentSeed || currentSeed.trim() === '') {
      currentSeed = Math.floor(Math.random() * 1000000000).toString();
      setSeed(currentSeed);
    }

    setSavedDbSeed(currentSeed);
    setSavedDbVoice(voice);

    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          model_name: modelName,
          provider: provider,
          fpt_api_keys: fptApiKeys,
          fpt_speed: parseFloat(fptSpeed),
          max_workers: parseInt(maxWorkers),
          self_hosted_url: selfHostedUrl,
          self_hosted_voice: voice,
          self_hosted_seed: currentSeed,
          self_hosted_keep_voice: "true",
          output_speed: parseFloat(outputSpeed)
        })
      })
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Đã lưu giọng nói cố định!',
          text: `Đã lưu cấu hình với Seed: ${seed || 'Tự động băm từ tên phong cách'}.`,
          background: '#1e293b',
          color: '#fff',
          timer: 2500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể lưu cấu hình giọng nói.', background: '#1e293b', color: '#fff' });
    }
  }

  const handleRefreshVoices = async () => {
    await fetchVoices(provider, selfHostedUrl);
  }

  const toggleLang = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi'
    i18n.changeLanguage(newLang)
  }

  const handleQuickConvert = async () => {
    if (!quickText.trim()) return;
    setIsQuickConverting(true)
    setQuickAudioUrl(null)
    localStorage.setItem('tts_quick_text', quickText)

    let currentSeed = seed;
    if (!currentSeed || currentSeed.trim() === '') {
      currentSeed = Math.floor(Math.random() * 1000000000).toString();
      setSeed(currentSeed);
    }

    const keepVoiceVal = (currentSeed === savedDbSeed && voice === savedDbVoice) ? "true" : "false";

    try {
      const res = await fetch(`${API_BASE_URL}/api/test-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: voice,
          text: quickText,
          api_key: apiKey,
          model_name: modelName,
          provider: provider,
          fpt_api_keys: fptApiKeys,
          fpt_speed: parseFloat(fptSpeed),
          self_hosted_url: selfHostedUrl,
          seed: currentSeed,
          keep_voice: keepVoiceVal,
          output_speed: parseFloat(outputSpeed)
        })
      })
      if (res.ok) {
        const blob = await res.blob()
        setQuickAudioUrl(URL.createObjectURL(blob))
      } else {
        const errData = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Gemini API Error',
          text: errData.detail || t("alerts.test_voice_error"),
          background: '#1e293b',
          color: '#fff',
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: t("alerts.conn_error"),
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      })
    }
    setIsQuickConverting(false)
  }



  // Deduplicate default model and fetched models
  const fallbackModels = [
    { name: 'models/gemini-2.5-flash-preview-tts', displayName: 'Gemini 2.5 Flash Preview TTS' }
  ];
  const allModels = models && models.length > 0 ? models : fallbackModels;

  return (
    <div className="app-container">
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <button
          className="btn"
          style={{ width: 'auto', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem' }}
          onClick={toggleLang}
        >
          {i18n.language === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
        </button>
      </div>

      <div className="header">
        <h1>TVC TTS Batcher</h1>
        <p>{t('title')}</p>
      </div>

      <div className="dashboard-layout">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="glass-panel">
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>{t('settings')}</h2>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Bộ Tạo Giọng (Provider)</label>
              <select value={provider} onChange={handleProviderChange}>
                <option value="fpt">FPT AI TTS (API)</option>
                <option value="gemini">Google Gemini (API)</option>
                <option value="self_hosted">Self-hosted (OmniVoice)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Tốc độ Phát (Output Speed)</label>
              <select value={outputSpeed} onChange={e => {
                const val = parseFloat(e.target.value);
                setOutputSpeed(val);
                fetch(`${API_BASE_URL}/api/settings`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ api_key: apiKey, model_name: modelName, provider: provider, fpt_api_keys: fptApiKeys, fpt_speed: parseFloat(fptSpeed), max_workers: parseInt(maxWorkers), self_hosted_url: selfHostedUrl, output_speed: val })
                });
              }}>
                <option value={0.5}>0.5x (Rất chậm)</option>
                <option value={0.75}>0.75x (Chậm)</option>
                <option value={1.0}>1.0x (Bình thường)</option>
                <option value={1.25}>1.25x (Hơi nhanh)</option>
                <option value={1.5}>1.5x (Nhanh)</option>
                <option value={1.75}>1.75x (Khá nhanh)</option>
                <option value={2.0}>2.0x (Rất nhanh)</option>
              </select>
            </div>

            {provider === 'gemini' && (
              <>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>{t('api_key')}</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      style={{ flex: 1, background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'white' }}
                    />
                    <button className="btn" style={{ width: 'auto', background: '#334155' }} onClick={handleSaveSettings}>{t('save_key')}</button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Google Gemini Model</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={modelName}
                      onChange={handleModelChange}
                      style={{ flex: 1 }}
                    >
                      {fallbackModels.map(fallback => {
                        const val = fallback.name.replace('models/', '');
                        if (models && models.length > 0 && !models.find(m => m.name === fallback.name || m.name === val)) {
                          return <option key={'fb_' + val} value={val}>{val}</option>;
                        }
                        return null;
                      })}
                      {allModels.map(m => {
                        const val = m.name.replace('models/', '');
                        return <option key={m.name} value={val}>{m.displayName || val}</option>
                      })}
                    </select>
                    <button className="btn" style={{ width: 'auto', background: '#3b82f6' }} onClick={() => fetchModels(apiKey)}>Refresh</button>
                  </div>
                </div>
              </>
            )}



            {provider === 'fpt' && (
              <>
                <div className="form-group" style={{ marginBottom: '1rem', marginTop: '1rem' }}>
                  <label>Danh sách API Keys (FPT AI)</label>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0.5rem 0' }}>
                    Mỗi key 1 dòng. Định dạng: <code>Tên tài khoản | API_KEY</code> hoặc chỉ cần nhập <code>API_KEY</code>.
                  </p>
                  <textarea
                    value={fptApiKeys}
                    onChange={e => setFptApiKeys(e.target.value)}
                    placeholder="Ví dụ:
Account1 | abcdef123456...
Account2 | 0987654321..."
                    rows={4}
                    style={{ width: '100%', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'white', fontFamily: 'monospace' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Tốc độ đọc (Speed: -3 đến 3)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="-3"
                      max="3"
                      step="0.1"
                      value={fptSpeed}
                      onChange={e => setFptSpeed(e.target.value)}
                      style={{ flex: 1, accentColor: '#3b82f6' }}
                    />
                    <span style={{ minWidth: '40px', textAlign: 'center', background: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{fptSpeed}</span>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Số luồng xử lý (Workers: 1 đến 10)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={maxWorkers}
                      onChange={e => setMaxWorkers(e.target.value)}
                      style={{ flex: 1, accentColor: '#3b82f6' }}
                    />
                    <span style={{ minWidth: '40px', textAlign: 'center', background: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{maxWorkers}</span>
                  </div>
                </div>
                <button className="btn" style={{ width: '100%', background: '#3b82f6' }} onClick={handleSaveSettings}>{t('save_key')}</button>
              </>
            )}

            {provider === 'self_hosted' && (
              <>
                <div className="form-group" style={{ marginBottom: '1.5rem', marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.1)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '0.95rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                    Kết nối Máy chủ (Self-hosted)
                  </label>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 1rem 0' }}>
                    Địa chỉ API server OmniVoice đang chạy (VD: <code>http://localhost:7860</code>).
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      value={selfHostedUrl}
                      onChange={e => setSelfHostedUrl(e.target.value.trim())}
                      placeholder="http://localhost:7860"
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        color: 'white',
                        fontFamily: 'monospace',
                        margin: 0,
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      className="btn"
                      style={{
                        width: '100%',
                        background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '0.75rem 1.25rem',
                        border: '1px solid rgba(59, 130, 246, 0.5)',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                        margin: 0
                      }}
                      onClick={handleCheckConnection}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Kiểm tra
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Số luồng xử lý (Workers: 1 đến 10)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={maxWorkers}
                      onChange={e => setMaxWorkers(e.target.value)}
                      style={{ flex: 1, accentColor: '#3b82f6' }}
                    />
                    <span style={{ minWidth: '40px', textAlign: 'center', background: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{maxWorkers}</span>
                  </div>
                </div>
                <button className="btn" style={{ width: '100%', background: '#3b82f6' }} onClick={handleSaveSettings}>{t('save_key')}</button>
              </>
            )}
          </div>

          <div className="glass-panel">
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>{t('test_voice_preview')}</h2>
            <div className="form-group">
              <label>{t('voice_selection')}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={voice} onChange={e => setVoice(e.target.value)} style={{ flex: 1 }}>
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn"
                  style={{ width: 'auto', background: '#334155', padding: '0.5rem 1rem' }}
                  onClick={handleRefreshVoices}
                  title="Tải lại danh sách giọng từ Server"
                >
                  🔄
                </button>
              </div>
            </div>
            {provider === 'self_hosted' && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Seed (Số nguyên ngẫu nhiên hoặc nhập để cố định)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    value={seed}
                    onChange={e => setSeed(e.target.value)}
                    placeholder="Để trống để random giọng"
                    style={{ flex: 1, background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'white' }}
                  />
                  <button
                    className="btn"
                    style={{ width: 'auto', background: '#334155' }}
                    onClick={() => setSeed(Math.floor(Math.random() * 1000000).toString())}
                  >
                    Random Seed
                  </button>
                </div>
              </div>
            )}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ margin: 0 }}>{t('test_text')}</label>
                <button
                  className="btn"
                  style={{
                    width: 'auto',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.8rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    margin: 0
                  }}
                  onClick={handleRandomizeTestText}
                >
                  🎲 Đổi câu
                </button>
              </div>
              <textarea
                rows="3"
                value={testText}
                onChange={e => setTestText(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: 'white',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <button className="btn" style={{ background: '#475569' }} onClick={handleTestVoice} disabled={isTestingVoice || (provider !== 'self_hosted' && !apiKey)}>
              {isTestingVoice ? t('testing') : ((apiKey || provider === 'self_hosted') ? t('test_voice', { voice: voice }) : t('api_key_required'))}
            </button>
            {provider === 'self_hosted' && (
              <button
                className="btn"
                style={{ marginTop: "20px", background: '#10b981' }}
                onClick={handleSaveVoiceConfig}
              >
                💾 Lưu cấu hình giọng nói
              </button>
            )}
            {audioUrl && (
              <audio src={audioUrl} controls autoPlay style={{ marginTop: '15px', width: '100%', borderRadius: '8px' }} />
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">
          {/* QUICK TTS PANEL */}
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>{t('quick_tts')}</h2>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <textarea
                rows="6"
                value={quickText}
                onChange={e => setQuickText(e.target.value)}
                placeholder={t('quick_placeholder')}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: 'white',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              className="btn btn-giant"
              style={{ width: 'auto', padding: '0.75rem 2.5rem', fontSize: '1.1rem' }}
              onClick={handleQuickConvert}
              disabled={isQuickConverting || (provider !== 'self_hosted' && !apiKey) || !quickText.trim()}
            >
              {isQuickConverting ? t('testing') : t('quick_convert')}
            </button>
            {quickAudioUrl && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <audio src={quickAudioUrl} controls autoPlay style={{ flex: 1, borderRadius: '8px' }} />
                <a
                  href={quickAudioUrl}
                  download={`tts_audio_${new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]}.wav`}
                  className="btn"
                  style={{ background: '#10b981', width: 'auto', padding: '0.75rem 1.5rem', textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
                >
                  ⬇ Tải về
                </a>
              </div>
            )}
          </div>
          <div className="glass-panel">
            <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>{t('batch_setup')}</h2>
            <div className="form-group">
              <label>{t('input_dir')}</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={inputDir}
                  onChange={e => setInputDir(e.target.value)}
                  placeholder="D:\Books\txt"
                  style={{ flex: 1 }}
                />
                <button className="btn" style={{ width: 'auto', background: '#334155' }} onClick={() => handleBrowse(setInputDir)}>{t('browse')}</button>
                <button className="btn" style={{ width: 'auto' }} onClick={handleScan} disabled={isScanning}>
                  {isScanning ? t('scanning') : t('scan')}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn" style={{ width: 'auto', background: '#3b82f6' }} onClick={handleBrowseDocx}>Chọn 1 file .docx</button>
                <button className="btn" style={{ width: 'auto', background: '#8b5cf6' }} onClick={handleBrowseBatchDocx}>Chọn Folder DOCX</button>
              </div>
              {fileCount > 0 && <small style={{ color: '#10b981' }}>{t('found_files', { count: fileCount })}</small>}
            </div>

            <div className="form-group">
              <label>{t('output_dir')}</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={outputDir}
                  onChange={e => setOutputDir(e.target.value)}
                  placeholder="D:\Books\mp3"
                  style={{ flex: 1 }}
                />
                <button className="btn" style={{ width: 'auto', background: '#334155' }} onClick={() => handleBrowse(setOutputDir)}>{t('browse')}</button>
              </div>
            </div>

            <button className="btn btn-giant" onClick={handleStartJob} disabled={fileCount === 0}>
              {t('start_batch')}
            </button>
          </div>

          <div className="glass-panel" style={{ maxHeight: '800px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{t('status_dashboard')}</h2>
              <button
                className="btn"
                title="Reset các task đang bị kẹt (Processing) về Pending để tiếp tục xử lý"
                style={{ width: 'auto', padding: '0.25rem 0.9rem', background: '#f59e0b', color: '#000', fontSize: '0.8rem', fontWeight: '600' }}
                onClick={handleResetStuck}
              >
                ⚡ Reset Stuck
              </button>
            </div>

            {progressJobs.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>Không có tiến trình nào đang chạy</div>
            )}

            {progressJobs.map(job => {
              const p = job.total > 0 ? Math.round((job.done + job.error) / job.total * 100) : 0;
              const isExpanded = !!expandedJobs[job.job_id]
              const tasks = jobTasks[job.job_id] || []
              return (
                <div key={job.job_id} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      {/* Chỉ DOCX job mới có nút expand */}
                      {job.is_docx_job ? (
                        <button
                          onClick={() => toggleJobExpand(job.job_id)}
                          title={isExpanded ? 'Thu gọn' : 'Mở rộng danh sách file'}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#38bdf8', fontSize: '1rem', padding: '0 0.3rem',
                            transition: 'transform 0.2s',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                          }}
                        >
                          ▶
                        </button>
                      ) : (
                        <span style={{ width: '1.5rem' }} />
                      )}
                      <strong
                        style={{ fontSize: '1.1rem', color: '#38bdf8', cursor: job.is_docx_job ? 'pointer' : 'default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onClick={() => job.is_docx_job && toggleJobExpand(job.job_id)}
                      >
                        {job.job_name || `Job #${job.job_id}`}
                      </strong>
                    </div>
                    <button
                      className="btn"
                      style={{ width: 'auto', padding: '0.2rem 0.8rem', background: '#ef4444', fontSize: '0.8rem', flexShrink: 0 }}
                      onClick={() => handleDeleteJob(job.job_id)}
                    >
                      {['Pending', 'Processing', 'Paused'].includes(job.status) ? 'Dừng & Xoá' : 'Xóa Lịch Sử'}
                    </button>
                  </div>

                  <div className="stats">
                    <span>{t('state')} <strong style={{ color: job.is_paused ? '#ef4444' : '#fff' }}>{job.is_paused ? 'PAUSED' : job.status}</strong></span>
                    <span>{t('total_tasks')} <strong style={{ color: '#fff' }}>{job.total}</strong></span>
                  </div>

                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${p}%` }}></div>
                  </div>

                  <div className="stats" style={{ marginBottom: '0' }}>
                    <span>{t('done')} <strong style={{ color: '#10b981' }}>{job.done}</strong></span>
                    <span>{t('error')} <strong style={{ color: '#ef4444' }}>{job.error}</strong></span>
                    <span>{t('processing')} <strong style={{ color: '#3b82f6' }}>{job.processing}</strong></span>
                    <span style={{ marginLeft: 'auto' }}><strong>{p}%</strong></span>
                  </div>

                  {/* Danh sách file txt khi expand */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '0.75rem',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      maxHeight: '260px',
                      overflowY: 'auto'
                    }}>
                      {tasks.length === 0 && (
                        <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem' }}>Không có file nào.</div>
                      )}
                      {tasks.map(task => {
                        const statusColor = {
                          Done: '#10b981',
                          Processing: '#3b82f6',
                          Error: '#ef4444',
                          Pending: '#94a3b8'
                        }[task.status] || '#94a3b8'

                        const statusIcon = {
                          Done: '✔',
                          Processing: '⧗',
                          Error: '✘',
                          Pending: '○'
                        }[task.status] || '○'

                        return (
                          <div key={task.id} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                            fontSize: '0.82rem'
                          }}>
                            <span style={{ color: statusColor, fontSize: '0.9rem', flexShrink: 0 }}>{statusIcon}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: statusColor }}>
                              {task.file_name}
                            </span>
                            <span style={{ color: statusColor, flexShrink: 0, fontWeight: '600', minWidth: '70px', textAlign: 'right' }}>{task.status}</span>
                            {task.status === 'Error' && (
                              <>
                                {task.error_message && (
                                  <span title={task.error_message} style={{ cursor: 'help', color: '#fbbf24', fontSize: '0.9rem' }}>⚠️</span>
                                )}
                                <button
                                  style={{
                                    background: '#f59e0b', border: 'none', color: '#000', cursor: 'pointer',
                                    borderRadius: '4px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: '600'
                                  }}
                                  onClick={() => handleRetryTask(task.id)}
                                >
                                  Retry
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  )
}

export default App
