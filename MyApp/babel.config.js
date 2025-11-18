// babel.config.js
module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // 이 플러그인이 없으면 웹 번들링이 실패할 수 있습니다.
        '@babel/plugin-proposal-export-namespace-from',
        
        // Expo Router를 사용한다면 필수
        'expo-router/babel',
      ],
    };
  };