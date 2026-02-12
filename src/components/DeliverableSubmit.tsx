'use client';

import { useState, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/contexts/ToastContext';
import { verifiedCreateDeliverable, uploadTaskFile, sendSystemMessage } from '@/lib/supabaseStore';
import { requestChallenge } from '@/lib/supabase';
import { ClipboardList } from 'lucide-react';

interface DeliverableSubmitProps {
  taskId: string;
  agentId: string;
  onDeliverableSubmitted?: () => void;
  className?: string;
}

export default function DeliverableSubmit({
  taskId,
  agentId,
  onDeliverableSubmitted,
  className = ''
}: DeliverableSubmitProps) {
  const { userAddress, isAuthenticated, signMsg } = useWallet();
  const { success: showSuccess, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    deliverableUrl: '',
    description: '',
    type: 'Other' as const,
    notes: ''
  });
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    fileName: string;
    fileSize: number;
  } | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deliverableTypes = ['Code', 'Document', 'Design', 'Data', 'API', 'Other'] as const;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!formData.deliverableUrl.trim() && !uploadedFile) {
      newErrors.deliverable = 'Either a URL or file upload is required';
    }

    if (formData.deliverableUrl.trim() && !formData.deliverableUrl.startsWith('https://')) {
      newErrors.deliverableUrl = 'URL must start with https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsSubmitting(true);
      const result = await uploadTaskFile(taskId, file);
      if (result) {
        setUploadedFile(result);
        showSuccess('File uploaded successfully');
        // Clear URL if file is uploaded
        setFormData(prev => ({ ...prev, deliverableUrl: '' }));
      } else {
        showError('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showError('Failed to upload file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !userAddress || !signMsg) {
      showError('Please connect your wallet');
      return;
    }
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Get wallet auth
      const challenge = await requestChallenge(userAddress);
      const signature = await signMsg(challenge.message);
      
      if (!signature) {
        showError('Signature required to submit deliverable');
        return;
      }

      const auth = { address: userAddress, nonce: challenge.nonce, signature };

      // Determine the final URL (either uploaded file or entered URL)
      const finalUrl = uploadedFile?.url || formData.deliverableUrl.trim();

      // Submit deliverable
      const result = await verifiedCreateDeliverable({
        taskId,
        agentId,
        content: `${formData.description}${formData.notes ? `\n\nNotes: ${formData.notes}` : ''}`,
        deliverableUrl: finalUrl,
        revisionNumber: 1 // Could be dynamic based on existing deliverables
      }, auth);

      if (result && typeof result === 'object') {
        // Send system message to chat
        await sendSystemMessage(
          taskId,
          `Deliverable submitted: ${formData.type} - ${formData.description.substring(0, 100)}${formData.description.length > 100 ? '...' : ''}`
        );

        // Reset form
        setFormData({
          deliverableUrl: '',
          description: '',
          type: 'Other',
          notes: ''
        });
        setUploadedFile(null);
        setErrors({});
        
        showSuccess('Deliverable submitted successfully!');
        onDeliverableSubmitted?.();
      } else {
        showError('Failed to submit deliverable');
      }
    } catch (error) {
      console.error('Error submitting deliverable:', error);
      showError('Failed to submit deliverable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`border border-gray-800 rounded-lg bg-gray-900 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl"><ClipboardList className="w-4 h-4 text-slate-400 inline" /></span>
        <h3 className="text-xl font-semibold text-white">Submit Deliverable</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deliverable Type */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Deliverable Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              type: e.target.value as typeof formData.type 
            }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
          >
            {deliverableTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Description *
            <span className="text-gray-400 font-normal ml-1">(What did you build/deliver?)</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what you've delivered, the approach you took, key features implemented, etc."
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 resize-vertical"
          />
          {errors.description && (
            <p className="text-red-400 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        {/* File Upload or URL */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Deliverable *
            <span className="text-gray-400 font-normal ml-1">(Upload file or provide URL)</span>
          </label>
          
          {/* Uploaded File Display */}
          {uploadedFile && (
            <div className="mb-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⊕</span>
                  <div>
                    <div className="text-white font-medium">{uploadedFile.fileName}</div>
                    <div className="text-gray-400 text-sm">{formatFileSize(uploadedFile.fileSize)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeUploadedFile}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* File Upload Button */}
          {!uploadedFile && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
                accept="image/*,.pdf,.zip,.txt,.csv,.json,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.html,.css,.md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="w-full border-2 border-dashed border-gray-700 hover:border-cyan-400 rounded-lg p-6 text-center transition-colors mb-4"
              >
                <div className="text-4xl mb-2">⊕</div>
                <div className="text-white font-medium">Upload File</div>
                <div className="text-gray-400 text-sm">Max 50MB • Code, Documents, Images, PDFs</div>
              </button>

              <div className="text-center text-gray-400 mb-4">OR</div>

              {/* URL Input */}
              <input
                type="url"
                value={formData.deliverableUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, deliverableUrl: e.target.value }))}
                placeholder="https://github.com/username/repo or https://drive.google.com/..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
              />
            </>
          )}
          
          {errors.deliverable && (
            <p className="text-red-400 text-sm mt-1">{errors.deliverable}</p>
          )}
          {errors.deliverableUrl && (
            <p className="text-red-400 text-sm mt-1">{errors.deliverableUrl}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Additional Notes
            <span className="text-gray-400 font-normal ml-1">(Optional)</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional context, setup instructions, or notes for the reviewer..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 resize-vertical"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting || !isAuthenticated}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Submitting...
              </div>
            ) : (
              'Submit Deliverable'
            )}
          </button>
        </div>

        {/* Helper Text */}
        <div className="text-sm text-gray-400 bg-gray-800 p-4 rounded-lg">
          <p className="mb-2"><ClipboardList className="w-4 h-4 text-slate-400 inline" /> <strong>Submission Guidelines:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Provide a clear description of what you've delivered</li>
            <li>Upload files directly or provide links to repositories/documents</li>
            <li>Include any setup instructions or dependencies in your notes</li>
            <li>The task poster will review your submission and provide feedback</li>
          </ul>
        </div>
      </form>
    </div>
  );
}