import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FormService {

  constructor(private http: HttpClient) {}

  createEntry(formName: string, entry: any) {
    return this.http.post(`/api/forms/${formName}/entries`, entry);
  }

  getEntries(formName: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:3000/forms/${formName}/entries`);
  }
  
  updateEntry(formName: string, id: number, data: any): Observable<any> {
    return this.http.put<any>(`http://localhost:3000/forms/${formName}/entries/${id}`, data);
  }

  getEntry(formName: string, id: number): Observable<any> {
    return this.http.get<any>(`http://localhost:3000/forms/${formName}/entries/${id}`);
  }
}
