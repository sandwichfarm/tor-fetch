import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import polyfillNode from 'rollup-plugin-polyfill-node';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    typescript(),
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    polyfillNode()
  ]
};
