import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Desktop App Configuration', () => {
  it('should have a valid electron entry point', () => {
    const mainPath = path.resolve(process.cwd(), 'electron/main.ts');
    expect(fs.existsSync(mainPath)).toBe(true);
  });

  it('should have electron in devDependencies', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.devDependencies).toHaveProperty('electron');
    expect(pkg.devDependencies).toHaveProperty('electron-builder');
  });

  it('should have the correct main entry in package.json', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.main).toBe('dist-electron/main.js');
  });

  it('should have build configuration for multiple platforms', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.build).toBeDefined();
    expect(pkg.build.mac).toBeDefined();
    expect(pkg.build.win).toBeDefined();
    expect(pkg.build.linux).toBeDefined();
  });
});
