import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import { ChallengeService } from './challenge.service';
import { Challenge } from '../Models/challenge.model';  // Make sure to import the correct type

describe('ChallengeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChallengeService],
    });
  });

  it('should be created', inject([ChallengeService], (service: ChallengeService) => {
    expect(service).toBeTruthy();
  }));

  it('should get all challenges directly from the rest api', inject([ChallengeService, HttpTestingController],
    fakeAsync((service: ChallengeService, httpMock: HttpTestingController) => {
      let res: Challenge[]; // Use the imported Challenge type
      service.find().subscribe((data) => (res = data)); // This should be of type Challenge[]

      const req = httpMock.expectOne('http://localhost:3000/api/Challenges/');
      req.flush([{ id: '1', name: 'Challenge 1', description: 'Test challenge' }]); // Make sure the response matches Challenge[]
      tick();

      expect(req.request.method).toBe('GET');
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].id).toBe('1');
      expect(res[0].name).toBe('Challenge 1');
      httpMock.verify();
    })
  ));

  it('should get current continue code directly from the rest api', inject([ChallengeService, HttpTestingController],
    fakeAsync((service: ChallengeService, httpMock: HttpTestingController) => {
      let res: { continueCode: string };
      service.continueCode().subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/continue-code');
      req.flush({ continueCode: 'apiResponse' });
      tick();

      expect(req.request.method).toBe('GET');
      expect(res.continueCode).toBe('apiResponse');
      httpMock.verify();
    })
  ));

  it('should pass continue code for restoring challenge progress on to the rest api', inject([ChallengeService, HttpTestingController],
    fakeAsync((service: ChallengeService, httpMock: HttpTestingController) => {
      let res: Challenge[];
      service.restoreProgress('CODE').subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/continue-code/apply/CODE');
      req.flush([{ id: '1', name: 'Restored Challenge', description: 'Restored description' }]); // Στέλνουμε πίνακα Challenge[]
      tick();

      expect(req.request.method).toBe('PUT');
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].id).toBe('1');
      expect(res[0].name).toBe('Restored Challenge');
      httpMock.verify();
    })
  ));

  it('should get current "Find It" coding challenge continue code directly from the rest api', inject([ChallengeService, HttpTestingController],
    fakeAsync((service: ChallengeService, httpMock: HttpTestingController) => {
      let res: { continueCode: string };
      service.continueCodeFindIt().subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/continue-code-findIt');
      req.flush({ continueCode: 'apiResponse' });
      tick();

      expect(req.request.method).toBe('GET');
      expect(res.continueCode).toBe('apiResponse');
      httpMock.verify();
    })
  ));

  it('should pass "Find It" coding challenge continue code for restoring progress on to the rest api', inject([ChallengeService, HttpTestingController],
    fakeAsync((service: ChallengeService, httpMock: HttpTestingController) => {
      let res: Challenge[];
      service.restoreProgressFindIt('CODE').subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/continue-code-findIt/apply/CODE');
      req.flush([{ id: '2', name: 'Find It Challenge', description: 'Find It description' }]);
      tick();

      expect(req.request.method).toBe('PUT');
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].id).toBe('2');
      expect(res[0].name).toBe('Find It Challenge');
      httpMock.verify();
    })
  ));

  it('should get current "Fix It" coding challenge continue code directly from the rest api', inject([ChallengeService, HttpTestingController],
    fakeAsync((service: ChallengeService, httpMock: HttpTestingController) => {
      let res: { continueCode: string };
      service.continueCodeFixIt().subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/continue-code-fixIt');
      req.flush({ continueCode: 'apiResponse' });
      tick();

      expect(req.request.method).toBe('GET');
      expect(res.continueCode).toBe('apiResponse');
      httpMock.verify();
    })
  ));

  it('should pass "Fix It" coding challenge continue code for restoring progress on to the rest api', inject([ChallengeService, HttpTestingController],
    fakeAsync((service: ChallengeService, httpMock: HttpTestingController) => {
      let res: Challenge[];
      service.restoreProgressFixIt('CODE').subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/continue-code-fixIt/apply/CODE');
      req.flush([{ id: '3', name: 'Fix It Challenge', description: 'Fix It description' }]);
      tick();

      expect(req.request.method).toBe('PUT');
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].id).toBe('3');
      expect(res[0].name).toBe('Fix It Challenge');
      httpMock.verify();
    })
  ));

  it('should repeat notification directly from the rest api', inject([ChallengeService, HttpTestingController],
    fakeAsync((service: ChallengeService, httpMock: HttpTestingController) => {
      let res: string;
      service.repeatNotification('CHALLENGE').subscribe((data) => (res = data));

      const req = httpMock.expectOne(req => req.url === 'http://localhost:3000/rest/repeat-notification');
      req.flush('apiResponse');
      tick();

      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('challenge')).toBe('CHALLENGE');
      expect(res).toBe('apiResponse');
      httpMock.verify();
    })
  ));
}); 