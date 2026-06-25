import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Swal from 'sweetalert2';

export function useBatchConvert(jsonHeaders, selfHostedUrl, fetchJobs, t) {
  const [inputDir, setInputDir] = useState(() => localStorage.getItem('tts_input_dir') || '');
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem('tts_output_dir') || '');
  const [fileCount, setFileCount] = useState(0);
  const [batchVoice, setBatchVoice] = useState('female');
  const [batchSpeed, setBatchSpeed] = useState(1);

  useEffect(() => {
    localStorage.setItem('tts_input_dir', inputDir);
    localStorage.setItem('tts_output_dir', outputDir);
  }, [inputDir, outputDir]);

  const handleScan = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/scan`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ directory: inputDir }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Scan failed');
      setFileCount(data.total || 0);
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' });
    }
  };

  const handleStartBatch = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          input_dir: inputDir,
          output_dir: outputDir,
          voice: batchVoice,
          provider: 'self_hosted',
          self_hosted_url: selfHostedUrl,
          output_speed: Number(batchSpeed)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Start job failed');
      const jobId = data.job_id || data.job_ids?.[0] || '';
      Swal.fire({ icon: 'success', title: t('common.success'), text: `Job #${jobId}`, background: '#1e293b', color: '#fff' });
      fetchJobs();
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' });
    }
  };

  return {
    inputDir, setInputDir, outputDir, setOutputDir, fileCount, setFileCount,
    batchVoice, setBatchVoice, batchSpeed, setBatchSpeed, handleScan, handleStartBatch
  };
}
