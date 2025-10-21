import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { ref, set, onValue } from 'firebase/database';
import { db } from './firebaseConfig';

export default function TestFirebase() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const testKey = 'test_user';

    // Écrire une donnée test
    const writeTest = async () => {
      try {
        await set(ref(db, 'test/' + testKey), {
          text: 'Bonjour Firebase !',
          timestamp: Date.now(),
        });
        console.log('Donnée test écrite avec succès');
      } catch (error) {
        console.error('Erreur écriture Firebase:', error);
      }
    };

    // Lire les données test en temps réel
    const readTest = () => {
      const testRef = ref(db, 'test/' + testKey);
      onValue(testRef, (snapshot) => {
        const data = snapshot.val();
        if (data) setMessage(data.text);
      });
    };

    writeTest();
    readTest();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{message ? message : 'Chargement...'}</Text>
    </View>
  );
}
