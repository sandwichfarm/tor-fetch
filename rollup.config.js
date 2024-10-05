import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';

const onwarn = (warning, warn) => {
  if (warning.code === 'CIRCULAR_DEPENDENCY') return;
  warn(warning);
}

export default [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/server',
      format: 'es',
      sourcemap: true,
      entryFileNames: '[name].js',
      strict: false,
      exports: 'auto',
    },
    plugins: [
      resolve({
        extensions: ['.js', '.ts'],
        preferBuiltins: true,
      }),
      commonjs({
        sourceMap: true,
      }),
      json({
        sourceMap: true,
      }),
      typescript({
        tsconfig: 'tsconfig.server.json',
      }),
    ],
    onwarn
  },
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/server',
      format: 'cjs',
      sourcemap: true,
      entryFileNames: '[name].cjs.js',
      strict: false,
      exports: 'named',
    },
    plugins: [
      resolve({
        extensions: ['.js'],
        preferBuiltins: true,
      }),
      commonjs({
        sourceMap: true,
      }),
      json({
        sourceMap: true,
      }),
      typescript({
        tsconfig: 'tsconfig.server.json',
      }),
      terser(),
    ],
    onwarn
  },
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/web',
      format: 'es',
      sourcemap: true,
      strict: false,
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: true,
        extensions: ['.js'],
      }),
      commonjs({
        sourceMap: true,
      }),
      json({
        sourceMap: true,
      }),
      typescript({
        tsconfig: 'tsconfig.web.json',
      }),
      terser(),
    ],
    onwarn
  },
];
