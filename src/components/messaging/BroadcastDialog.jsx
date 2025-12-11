import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Megaphone, AlertCircle, Upload, X } from 'lucide-react';
import { toast } from "sonner";

export default function BroadcastDialog({ open, onOpenChange, currentUser }) {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [broadcastGroup, setBroadcastGroup] = useState('all_caregivers');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers-active'],
    queryFn: () => base44.entities.Caregiver.filter({ status: 'active' }),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const broadcastMutation = useMutation({
    mutationFn: async (broadcastData) => {
      const message = await base44.entities.Message.create(broadcastData);
      
      // Create notification for each recipient
      const recipients = broadcastData.broadcast_recipients || [];
      for (const recipientId of recipients) {
        const recipient = users.find(u => u.id === recipientId);
        if (recipient?.email) {
          await base44.entities.Notification.create({
            user_email: recipient.email,
            type: broadcastData.priority === 'critical' ? 'urgent' : 'general',
            title: broadcastData.priority === 'critical' ? '🚨 Critical Broadcast Message' : '📢 Broadcast Message',
            message: broadcastData.content.substring(0, 100) + '...',
            priority: broadcastData.priority === 'critical' ? 'urgent' : broadcastData.priority === 'urgent' ? 'high' : 'medium'
          });
        }
      }
      
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Broadcast sent successfully');
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to send broadcast');
      console.error(error);
    }
  });

  const resetForm = () => {
    setMessage('');
    setPriority('normal');
    setBroadcastGroup('all_caregivers');
    setSelectedRecipients([]);
    setAttachments([]);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({
          name: file.name,
          url: file_url,
          type: file.type,
          size: file.size
        });
      }
      setAttachments([...attachments, ...uploaded]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getRecipientList = () => {
    if (broadcastGroup === 'all_caregivers') {
      return caregivers.map(c => c.id);
    } else if (broadcastGroup === 'all_staff') {
      return users.filter(u => u.user_role && u.user_role !== 'caregiver').map(u => u.id);
    } else if (broadcastGroup === 'specific_group') {
      return selectedRecipients;
    }
    return [];
  };

  const handleSend = () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const recipients = getRecipientList();
    if (recipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    broadcastMutation.mutate({
      business_id: currentUser.business_id,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      content: message,
      priority,
      is_broadcast: true,
      is_urgent: priority === 'critical',
      broadcast_group: broadcastGroup,
      broadcast_recipients: recipients,
      attachments,
      read_by: []
    });
  };

  const toggleRecipient = (userId) => {
    setSelectedRecipients(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-teal-600" />
            Send Broadcast Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Priority */}
          <div>
            <Label>Priority Level</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">⚠️ Urgent</SelectItem>
                <SelectItem value="critical">🚨 Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Group */}
          <div>
            <Label>Send To</Label>
            <Select value={broadcastGroup} onValueChange={setBroadcastGroup}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_caregivers">All Caregivers ({caregivers.length})</SelectItem>
                <SelectItem value="all_staff">All Staff</SelectItem>
                <SelectItem value="specific_group">Specific People</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Specific Recipients */}
          {broadcastGroup === 'specific_group' && (
            <div className="border border-slate-200 rounded-lg p-4 max-h-48 overflow-y-auto">
              <Label className="mb-2 block">Select Recipients</Label>
              <div className="space-y-2">
                {[...caregivers, ...users.filter(u => u.user_role && u.user_role !== 'caregiver')].map((person) => (
                  <div key={person.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedRecipients.includes(person.id)}
                      onCheckedChange={() => toggleRecipient(person.id)}
                    />
                    <label className="text-sm">
                      {person.name || person.full_name} 
                      {person.user_role && <span className="text-slate-500 ml-1">({person.user_role})</span>}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your broadcast message..."
              rows={6}
            />
          </div>

          {/* Attachments */}
          <div>
            <Label>Attachments</Label>
            <div className="space-y-2">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="broadcast-file-upload"
                accept="image/*,.pdf,.doc,.docx"
              />
              <label htmlFor="broadcast-file-upload">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  disabled={uploading}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Attach Files'}
                  </span>
                </Button>
              </label>

              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {priority !== 'normal' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-900">
                <strong>{priority === 'critical' ? 'Critical' : 'Urgent'} messages</strong> will trigger immediate notifications to all recipients.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Badge variant="secondary">
              {getRecipientList().length} recipient(s)
            </Badge>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSend}
                disabled={broadcastMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}