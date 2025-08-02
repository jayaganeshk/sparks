<template>
  <v-dialog v-model="dialog" persistent max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Create New Album</span>
      </v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-text-field
            v-model="albumData.title"
            :rules="[rules.required, rules.minLength]"
            label="Album Title*"
            required
            counter="50"
            maxlength="50"
            :disabled="saving"
          ></v-text-field>
          <v-textarea
            v-model="albumData.description"
            label="Description"
            rows="3"
            counter="200"
            maxlength="200"
            :disabled="saving"
            hint="Provide a brief description of this album's contents"
          ></v-textarea>
        </v-form>
        <small>*indicates required field</small>
        
        <v-alert
          v-if="errorMessage"
          type="error"
          class="mt-4"
          :text="errorMessage"
          variant="tonal"
          density="compact"
        ></v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" text @click="closeDialog">Cancel</v-btn>
        <v-btn color="blue-darken-1" text @click="saveAlbum" :disabled="!valid" :loading="saving">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { albumService } from '@/services';

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(['update:modelValue', 'album-created']);

const dialog = ref(props.modelValue);
const valid = ref(false);
const saving = ref(false);
const form = ref(null);
const errorMessage = ref(null);
const albumData = ref({
  title: '',
  description: '',
});

const rules = {
  required: value => !!value || 'Required.',
  minLength: value => (value && value.length >= 3) || 'Title must be at least 3 characters',
};

watch(() => props.modelValue, (newValue) => {
  dialog.value = newValue;
  if (!newValue) {
    // Reset form and error message when dialog is closed
    form.value?.reset();
    errorMessage.value = null;
  }
});

const closeDialog = () => {
  emit('update:modelValue', false);
};

const saveAlbum = async () => {
  // Clear any previous error
  errorMessage.value = null;
  
  if (form.value?.validate()) {
    saving.value = true;
    try {
      await albumService.createAlbum(albumData.value);
      emit('album-created');
      closeDialog();
    } catch (error) {
      console.error('Failed to create album:', error);
      errorMessage.value = 'Failed to create album. Please try again.';
    } finally {
      saving.value = false;
    }
  }
};
</script>
