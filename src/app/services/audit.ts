import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuditResponse {
  success: boolean;
  detections: string[];
  annotated_image: string;
  audit_report: string;
}

export interface CopilotResponse {
  success: boolean;
  answer: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private apiUrl = 'https://mineguard-api-i5t1.onrender.com/api';

  constructor(private http: HttpClient) {}

  auditFrame(file: File): Observable<AuditResponse> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<AuditResponse>(`${this.apiUrl}/audit/`, formData);
  }

  queryCopilot(query: string): Observable<CopilotResponse> {
    return this.http.post<CopilotResponse>(`${this.apiUrl}/copilot/`, { query });
  }
}