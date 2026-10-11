import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService, AuditResponse } from './services/audit';
import { marked } from 'marked';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  title = 'MineGuard AI Enterprise';

  selectedTab: 'upload' | 'camera' | 'copilot' = 'upload';
  activeScenario: 'A' | 'B' | null = null; 

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  loading: boolean = false;
  
  auditResult: AuditResponse | null = null;
  renderedReportHtml: string = '';

  copilotQuery: string = '';
  copilotAnswerHtml: string = '';
  copilotLoading: boolean = false;

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  cameraStream: MediaStream | null = null;

  constructor(private auditService: AuditService) {}

  switchTab(tab: 'upload' | 'camera' | 'copilot') {
    this.selectedTab = tab;
    this.auditResult = null;
    this.renderedReportHtml = '';
    this.activeScenario = null;
    
    // Stop camera if navigating away
    if (tab !== 'camera' && this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }

    if (tab === 'camera') this.startCamera();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.auditResult = null;
      this.activeScenario = null; // Clear scenario highlighting
      const reader = new FileReader();
      reader.onload = (e: any) => this.previewUrl = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  async loadBenchmark(filename: string, scenario: 'A' | 'B') {
    this.activeScenario = scenario;
    this.previewUrl = `/${filename}`;
    this.auditResult = null;
    
    try {
      const response = await fetch(this.previewUrl);
      const blob = await response.blob();
      this.selectedFile = new File([blob], filename, { type: 'image/jpeg' });
      this.runAnalysis(); // Auto-runs analysis
    } catch (e) {
      console.error("Failed to load benchmark image:", e);
    }
  }

  runAnalysis() {
    if (!this.selectedFile) return;
    this.loading = true;
    this.auditService.auditFrame(this.selectedFile).subscribe({
      next: async (res) => {
        this.auditResult = res;
        this.renderedReportHtml = await marked.parse(res.audit_report);
        this.loading = false;
      },
      error: (err) => {
        console.error('Audit failed:', err);
        alert('Analysis failed. Ensure Django backend is running on port 8000.');
        this.loading = false;
      }
    });
  }

  async startCamera() {
    try {
      // Allow browser default resolution to prevent stream lagging
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setTimeout(() => {
        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.cameraStream;
        }
      }, 100);
    } catch (e) {
      alert('Unable to access webcam. Check browser permissions.');
    }
  }

  captureFrame() {
    if (!this.videoElement) return;
    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        this.selectedFile = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' });
        this.previewUrl = canvas.toDataURL('image/jpeg');
        this.runAnalysis();
      }
    }, 'image/jpeg');
  }

  submitCopilot() {
    if (!this.copilotQuery.trim()) return;
    this.copilotLoading = true;
    this.auditService.queryCopilot(this.copilotQuery).subscribe({
      next: async (res) => {
        this.copilotAnswerHtml = await marked.parse(res.answer);
        this.copilotLoading = false;
      },
      error: (err) => {
        console.error('Copilot query error:', err);
        this.copilotLoading = false;
      }
    });
  }
}