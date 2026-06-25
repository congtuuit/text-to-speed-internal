import { useState } from 'react';
import { API_BASE_URL } from '../config';
import Swal from 'sweetalert2';

export function useBatchConvert(authToken, selfHostedUrl, fetchJobs, t) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchVoice, setBatchVoice] = useState('female');
  const [batchSpeed, setBatchSpeed] = useState(1);

  const handleStartBatch = async () => {
    if (selectedFiles.length === 0) {
      Swal.fire({ icon: 'warning', title: t('common.error'), text: 'Vui lòng chọn ít nhất 1 file .txt hoặc .docx', background: '#1e293b', color: '#fff' });
      return;
    }

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('voice', batchVoice);
      formData.append('provider', 'self_hosted');
      formData.append('self_hosted_url', selfHostedUrl);
      formData.append('output_speed', String(batchSpeed));

      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/jobs/upload-run`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Start job failed');
      
      const jobId = data.job_id || data.job_ids?.[0] || '';
      Swal.fire({ icon: 'success', title: t('common.success'), text: `Đã tạo Job #${jobId}`, background: '#1e293b', color: '#fff' });
      setSelectedFiles([]); // Reset files on success
      fetchJobs();
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('common.error'), text: err.message, background: '#1e293b', color: '#fff' });
    }
  };

  return {
    selectedFiles, setSelectedFiles,
    batchVoice, setBatchVoice, batchSpeed, setBatchSpeed, handleStartBatch
  };
}
