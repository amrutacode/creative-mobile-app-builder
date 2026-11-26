// Placeholder content for the workspace layout (code view files and phone
// frame size). The files are meant to be replaced by real generated code.

import type { FileNode } from "./types"

export const PHONE_WIDTH = 280
export const PHONE_HEIGHT = 580

const APP_TSX = `import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import HomeScreen from "./src/screens/HomeScreen"
import DetailsScreen from "./src/screens/DetailsScreen"

const Stack = createNativeStackNavigator()

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
`

const HOME_TSX = `import { View, Text, StyleSheet } from "react-native"

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome 👋</Text>
      <Text style={styles.subtitle}>Your app is being generated...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { marginTop: 8, color: "#6b7280" },
})
`

const DETAILS_TSX = `import { View, Text } from "react-native"

export default function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Details</Text>
    </View>
  )
}
`

const BUTTON_TSX = `import { Pressable, Text } from "react-native"

export function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: "#4f46e5", padding: 14, borderRadius: 12 }}>
      <Text style={{ color: "#fff", fontWeight: "600", textAlign: "center" }}>{title}</Text>
    </Pressable>
  )
}
`

const APP_JSON = `{
  "expo": {
    "name": "my-app",
    "slug": "my-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "platforms": ["ios", "android"]
  }
}
`

const PACKAGE_JSON = `{
  "name": "my-app",
  "main": "expo/AppEntry.js",
  "scripts": {
    "start": "expo start"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0"
  }
}
`

export const DUMMY_FILE_TREE: FileNode[] = [
  {
    type: "folder",
    name: "src",
    path: "src",
    children: [
      {
        type: "folder",
        name: "screens",
        path: "src/screens",
        children: [
          { type: "file", name: "HomeScreen.tsx", path: "src/screens/HomeScreen.tsx", language: "tsx", content: HOME_TSX },
          { type: "file", name: "DetailsScreen.tsx", path: "src/screens/DetailsScreen.tsx", language: "tsx", content: DETAILS_TSX },
        ],
      },
      {
        type: "folder",
        name: "components",
        path: "src/components",
        children: [
          { type: "file", name: "Button.tsx", path: "src/components/Button.tsx", language: "tsx", content: BUTTON_TSX },
        ],
      },
    ],
  },
  { type: "file", name: "App.tsx", path: "App.tsx", language: "tsx", content: APP_TSX },
  { type: "file", name: "app.json", path: "app.json", language: "json", content: APP_JSON },
  { type: "file", name: "package.json", path: "package.json", language: "json", content: PACKAGE_JSON },
]

export const DEFAULT_OPEN_FILE = "App.tsx"
