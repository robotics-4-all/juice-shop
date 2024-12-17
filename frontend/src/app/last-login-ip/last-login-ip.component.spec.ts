/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
import * as jwt from 'jsonwebtoken';

import { type ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { LastLoginIpComponent } from './last-login-ip.component'
import { MatCardModule } from '@angular/material/card'
import { DomSanitizer } from '@angular/platform-browser'

describe('LastLoginIpComponent', () => {
  let component: LastLoginIpComponent
  let fixture: ComponentFixture<LastLoginIpComponent>
  let sanitizer

  const secretKey = 'test-secret'; // Secret for JWT signing

  beforeEach(waitForAsync(() => {
    sanitizer = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml', 'sanitize'])
    sanitizer.bypassSecurityTrustHtml.and.callFake((args: any) => args)
    sanitizer.sanitize.and.returnValue({})

    TestBed.configureTestingModule({
      declarations: [LastLoginIpComponent],
      providers: [
        { provide: DomSanitizer, useValue: sanitizer }
      ],
      imports: [
        MatCardModule
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(LastLoginIpComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should compile', () => {
    expect(component).toBeTruthy()
  })

  it('should log JWT parsing error to console', () => {
    console.log = jasmine.createSpy('log')
    localStorage.setItem('token', 'definitelyInvalidJWT')
    component.ngOnInit()
    expect(console.log).toHaveBeenCalled()
  })

  xit('should set Last-Login IP from JWT as trusted HTML', () => {
    // Generate JWT with "lastLoginIp"
    const token = jwt.sign(
      { data: { lastLoginIp: '1.2.3.4' } },
      secretKey,
      { algorithm: 'HS256' }
    );

    // Set JWT in localStorage
    localStorage.setItem('token', token);

    // Trigger ngOnInit
    component.ngOnInit();

    // Assert that the sanitizer method was called with the correct HTML
    expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<small>1.2.3.4</small>');
  });

  xit('should not set Last-Login IP if none is present in JWT', () => {
    // Generate JWT without "lastLoginIp"
    const token = jwt.sign(
      { data: {} },
      secretKey,
      { algorithm: 'HS256' }
    );

    // Set JWT in localStorage
    localStorage.setItem('token', token);

    // Trigger ngOnInit
    component.ngOnInit();

    // Assert that the sanitizer method was not called
    expect(sanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled();
  });
})
