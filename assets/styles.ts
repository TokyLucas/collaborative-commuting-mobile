// styles.ts
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        maxHeight: '90%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginVertical: 5,
    },
    map: {
        width: '100%',
        height: 150,
        marginVertical: 10,
    },
    label: {
        fontWeight: 'bold',
        marginTop: 10,
    },
    buttons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
    },
    btn: {
        backgroundColor: '#3498db',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancel: {
        backgroundColor: '#e74c3c',
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default styles;
